import { LitElement, html, nothing } from "lit";
import { hostStyles } from "./FeedbackDialog.styles";
import { customElement, property, state } from "lit/decorators.js";
import logo from "../assets/logo";
import { Form } from "../utils/form";
import { ref, createRef } from "lit/directives/ref.js";
import { ecstatic, happy, joyless, neutral, sad } from "../assets/smilies";
import { styleMap } from "lit/directives/style-map.js";

declare global {
  interface HTMLElementTagNameMap {
    "bucket-feedback-dialog": FeedbackDialog;
  }
}

@customElement("bucket-feedback-dialog")
export class FeedbackDialog extends LitElement {
  static styles = [hostStyles];
  static scores = [
    { color: "#dd6b20", icon: joyless },
    { color: "#ed8936", icon: sad },
    { color: "#787c91", icon: neutral },
    { color: "#48bb78", icon: happy },
    { color: "#38a169", icon: ecstatic },
  ];

  @property() featureId = "";
  @property() userId = "";
  @property() companyId = "";
  @property() title = "How satisfied are you with this feature?";

  @state() valid = false;

  protected dialogRef = createRef<HTMLDialogElement>();
  protected form = new Form({
    rules: {
      score: {
        required: true,
      },
      comment: {
        required: true,
      },
    },
    onChange: ({ valid }) => {
      this.valid = valid;
    },
  });

  open(modal = false) {
    if (modal) {
      this.dialogRef.value?.showModal();
    } else {
      this.dialogRef.value?.show();
    }
  }

  protected onSubmit = this.form.handleSubmit((values) => {
    console.log(values);
    if (typeof bucket !== "undefined") {
      bucket?.feedback({
        featureId: this.featureId,
        userId: this.userId,
        companyId: this.companyId,
        score: 0,
        comment: values.comment as string,
      });
    }
  });

  protected render() {
    return html`
      <dialog ${ref(this.dialogRef)} id="bucket-feedback-dialog" class="dialog">
        <form @submit=${this.onSubmit}>
          <div
            role="group"
            class="form-control"
            aria-labelledby="bucket-feedback-score-label"
          >
            <div id="bucket-feedback-score-label">${this.title}</div>
            <div class="radio-group">
              ${FeedbackDialog.scores.map(({ icon, color }, index) => {
                return html`
                  <input
                    id="bucket-feedback-score-${index + 1}"
                    type="radio"
                    ${this.form.register("score")}
                    value=${index + 1}
                  />
                  <label
                    for="bucket-feedback-score-${index + 1}"
                    class="button"
                    style=${styleMap({
                      color,
                    })}
                  >
                    ${icon}
                  </label>
                `;
              })}
            </div>
          </div>

          <div class="form-control">
            <label for="bucket-feedback-comment">
              Leave a comment <em>(optional)</em>
            </label>
            <textarea
              id="bucket-feedback-comment"
              ${this.form.register("comment")}
              placeholder="How can we improve this feature?"
              rows="5"
            ></textarea>
          </div>
          <button
            id="confirmBtn"
            class="button primary"
            value="default"
            disabled=${!this.valid || nothing}
          >
            Send
          </button>
          <footer class="plug">Powered by ${logo} Bucket</footer>
        </form>
      </dialog>
    `;
  }
}

// <button
// type="button"
// style=${styleMap({ backgroundColor })}
// @click=${onClick}
// >
// ${label}
// </button>
