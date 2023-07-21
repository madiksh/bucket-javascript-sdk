import type { Preview } from "@storybook/web-components";

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: "^@[A-Z].*" },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
  },
};

export default preview;
