import { FEATURE_EVENTS_PER_MIN } from "../config";
import { BucketContext } from "../context";
import { HttpClient } from "../httpClient";
import { Logger, loggerWithPrefix } from "../logger";
import RateLimiter from "../rateLimiter";
import { AblySSEConn } from "../sse";

import {
  FeatureCache,
  isObject,
  parseAPIFeaturesResponse,
} from "./featureCache";
import maskedProxy from "./maskedProxy";

export type APIFeatureResponse = {
  value: boolean;
  key: string;
  version?: number;
};

export type APIFeaturesResponse = Record<string, APIFeatureResponse>;
export type APIResponse = {
  features: APIFeaturesResponse | undefined;
  updatedAt: number;
};

export type Features = Record<string, boolean>;

export type FeaturesOptions = {
  fallbackFeatures?: string[];
  timeoutMs?: number;
  staleWhileRevalidate?: boolean;
  failureRetryAttempts?: number | false;
  onUpdatedFeatures?: (flags: Features) => void;
};

type Config = {
  fallbackFeatures: string[];
  timeoutMs: number;
  staleWhileRevalidate: boolean;
  failureRetryAttempts: number | false;
};

export const DEFAULT_FEATURES_CONFIG: Config = {
  fallbackFeatures: [],
  timeoutMs: 5000,
  staleWhileRevalidate: false,
  failureRetryAttempts: false,
};

// Deep merge two objects.
export function mergeDeep(
  target: Record<string, any>,
  ...sources: Record<string, any>[]
): Record<string, any> {
  if (!sources.length) return target;
  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        mergeDeep(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return mergeDeep(target, ...sources);
}

export type FeaturesResponse = {
  success: boolean;
  features: APIFeaturesResponse;
};

export function validateFeaturesResponse(response: any) {
  if (!isObject(response)) {
    return;
  }

  const { success, updatedAt, features } = response;

  if (
    typeof success !== "boolean" ||
    typeof updatedAt !== "number" ||
    !isObject(features)
  ) {
    return;
  }
  const flagsParsed = parseAPIFeaturesResponse(features);
  if (!flagsParsed) {
    return;
  }

  return {
    success: response.success,
    features,
    updatedAt,
  };
}

export function flattenJSON(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const key in obj) {
    if (typeof obj[key] === "object") {
      const flat = flattenJSON(obj[key]);
      for (const flatKey in flat) {
        result[`${key}.${flatKey}`] = flat[flatKey];
      }
    } else {
      result[key] = obj[key];
    }
  }
  return result;
}

export function clearFeatureCache() {
  localStorage.clear();
}

export const FEATURES_STALE_MS = 60000; // turn stale after 60 seconds, optionally reevaluate in the background
export const FEATURES_EXPIRE_MS = 7 * 24 * 60 * 60 * 1000; // expire entirely after 7 days

const localStorageCacheKey = `__bucket_features`;

export class FeaturesClient {
  private logger: Logger;
  private cache: FeatureCache;
  private config: Config;
  private rateLimiter: RateLimiter;

  private features: Features | undefined;
  private updatedAt: number;

  constructor(
    private httpClient: HttpClient,
    private context: BucketContext,
    logger: Logger,
    options?: FeaturesOptions & {
      cache?: FeatureCache;
      rateLimiter?: RateLimiter;
      liveConn?: AblySSEConn;
      onUpdatedFeatures?: (flags: Features) => void;
    },
  ) {
    this.logger = loggerWithPrefix(logger, "[Features]");
    this.cache = options?.cache
      ? options.cache
      : new FeatureCache({
          storage: {
            get: () => localStorage.getItem(localStorageCacheKey),
            set: (value) => localStorage.setItem(localStorageCacheKey, value),
          },
          staleTimeMs: FEATURES_STALE_MS,
          expireTimeMs: FEATURES_EXPIRE_MS,
        });
    this.config = { ...DEFAULT_FEATURES_CONFIG, ...options };
    this.rateLimiter =
      options?.rateLimiter ??
      new RateLimiter(FEATURE_EVENTS_PER_MIN, this.logger);

    this.updatedAt = 0;

    if (options?.onUpdatedFeatures) {
      // subscribe to changes in targeting
      options?.liveConn?.addOnMessageCallback(
        "targeting_updated",
        (message) => {
          if (message.updatedAt && message.updatedAt > this.updatedAt) {
            this.refreshFeatures().catch((e) => {
              this.logger.error(
                "error refreshing flags following targeting-updated message",
                e,
              );
            });
          }
        },
      );
    }
  }

  private setFeatures(features: APIResponse) {
    // ignore failures or older versions
    if (!features || !features.features || features.updatedAt < this.updatedAt)
      return;

    const proxiedFlags = maskedProxy(features?.features || {}, (fs, key) => {
      this.sendCheckEvent({
        key,
        version: fs[key].version,
        value: fs[key]?.value ?? false,
      }).catch((e) => {
        this.logger.error("error sending feature check event", e);
      });
      return fs[key]?.value || false;
    });
    this.features = proxiedFlags;
    this.updatedAt = features.updatedAt;

    if (this.config.onUpdatedFlags) {
      this.config.onUpdatedFlags(this.features);
    }
  }

  public async maybeRefreshFeatures() {
    this.setFeatures(await this.maybeFetchFeatures());
  }

  public async refreshFeatures() {
    this.setFeatures(await this.fetchFeatures());
  }

  getFeatures(): Features | undefined {
    return this.features;
  }

  private fetchParams() {
    const flattenedContext = flattenJSON({ context: this.context });
    const params = new URLSearchParams(flattenedContext);
    // publishableKey should be part of the cache key
    params.append("publishableKey", this.httpClient.publishableKey);

    // sort the params to ensure that the URL is the same for the same context
    params.sort();

    return params;
  }

  private async maybeFetchFeatures(): Promise<APIResponse> {
    const cachedItem = this.cache.get(this.fetchParams().toString());

    // if there's no cached item OR the cached item is a failure and we haven't retried
    // too many times yet - fetch now
    if (
      !cachedItem ||
      (!cachedItem.success &&
        (this.config.failureRetryAttempts === false ||
          cachedItem.attemptCount < this.config.failureRetryAttempts))
    ) {
      return await this.fetchFeatures();
    }

    // cachedItem is a success or a failed attempt that we've retried too many times
    if (cachedItem.stale) {
      // serve successful stale cache if `staleWhileRevalidate` is enabled
      if (this.config.staleWhileRevalidate && cachedItem.success) {
        // re-fetch in the background, return last successful value
        this.fetchFeatures().catch(() => {
          // we don't care about the result, we just want to re-fetch
        });
        return {
          features: cachedItem.features,
          updatedAt: cachedItem.updatedAt,
        };
      }

      return await this.fetchFeatures();
    }

    // serve cached items if not stale and not expired
    return { features: cachedItem.features, updatedAt: cachedItem.updatedAt };
  }

  public async fetchFeatures(): Promise<APIResponse> {
    const params = this.fetchParams();
    const cacheKey = params.toString();
    try {
      const res = await this.httpClient.get({
        path: "/features/enabled",
        timeoutMs: this.config.timeoutMs,
        params,
      });

      if (!res.ok) {
        let errorBody = null;
        try {
          errorBody = await res.json();
        } catch (e) {
          // ignore
        }

        throw new Error(
          "unexpected response code: " +
            res.status +
            " - " +
            JSON.stringify(errorBody),
        );
      }
      const typeRes = validateFeaturesResponse(await res.json());
      if (!typeRes || !typeRes.success) {
        throw new Error("unable to validate response");
      }

      this.cache.set(cacheKey, {
        success: true,
        features: typeRes.features,
        updatedAt: typeRes.updatedAt,
        attemptCount: 0,
      });

      return typeRes;
    } catch (e) {
      this.logger.error("error fetching features: ", e);

      const current = this.cache.get(cacheKey);
      if (current) {
        // if there is a previous failure cached, increase the attempt count
        this.cache.set(cacheKey, {
          success: current.success,
          features: current.features,
          attemptCount: current.attemptCount + 1,
          updatedAt: current.updatedAt,
        });
      } else {
        // otherwise cache if the request failed and there is no previous version to extend
        // to avoid having the UI wait and spam the API
        this.cache.set(cacheKey, {
          success: false,
          features: undefined,
          attemptCount: 1,
          updatedAt: 0,
        });
      }

      const features = this.config.fallbackFeatures.reduce((acc, key) => {
        acc[key] = {
          key,
          value: true,
        };
        return acc;
      }, {} as APIFeaturesResponse);
      return {
        features,
        updatedAt: 0,
      };
    }
  }

  /**
   * Send a feature "check" event.
   *
   *
   * @param feature - The feature to send the event for.
   */
  async sendCheckEvent(feature: {
    key: string;
    value: boolean;
    version?: number;
  }) {
    const rateLimitKey = `${this.fetchParams().toString()}:${feature.key}:${feature.version}:${feature.value}`;

    await this.rateLimiter.rateLimited(rateLimitKey, async () => {
      const payload = {
        action: "check",
        key: feature.key,
        targetingVersion: feature.version,
        evalContext: this.context,
        evalResult: feature.value,
      };

      this.httpClient
        .post({
          path: "features/events",
          body: payload,
        })
        .catch((e: any) => {
          this.logger.warn(`failed to send feature check event`, e);
        });

      this.logger.debug(`sent feature event`, payload);
    });

    return feature.value;
  }
}
