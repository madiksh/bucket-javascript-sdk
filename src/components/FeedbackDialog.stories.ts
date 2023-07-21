import type { Meta, StoryObj } from "@storybook/web-components";
import type { FeedbackDialog, FeedbackDialogProps } from "./FeedbackDialog";
import { html } from "lit-html";
import "./FeedbackDialog";

// More on how to set up stories at: https://storybook.js.org/docs/web-components/writing-stories/introduction
const meta: Meta<FeedbackDialogProps> = {
  title: "Components/FeedbackDialog",
  tags: ["autodocs"],
  render: (args) => {
    const showDialog = (modal: boolean) => {
      const dialog = document.querySelector<FeedbackDialog>(
        "bucket-feedback-dialog"
      );
      dialog?.open(modal);
    };
    return html` <bucket-feedback-dialog></bucket-feedback-dialog>
      <button @click=${() => showDialog(false)}>Give feedback popover</button>
      <button @click=${() => showDialog(true)}>Give feedback modal</button>`;
  },
  argTypes: {
    open: {
      table: {
        disable: true,
      },
    },
  },
};

export default meta;
type Story = StoryObj<FeedbackDialogProps>;

// More on writing stories with args: https://storybook.js.org/docs/web-components/writing-stories/args
export const Primary: Story = {
  args: {},
};
