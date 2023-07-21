import { css } from "lit";

export const hostStyles = css`
  :host .dialog {
    display: flex;
    border: none;
    background-color: var(--bucket-feedback-dialog-bg, white);
    border-radius: var(--bucket-feedback-dialog-radius, 6px);
    box-shadow: var(
      --bucket-feedback-dialog-shadow,
      0 10px 15px -3px rgba(0, 0, 0, 0.1),
      0 4px 6px -2px rgba(0, 0, 0, 0.05)
    );
    font-family: var(
      --bucket-feedback-dialog-font-family,
      "Inter",
      system-ui,
      "Open Sans",
      sans-serif
    );
    opacity: 0;
    transform: scale(0.95);
    transition: opacity 200ms ease-in-out, transform 200ms ease-in-out;
  }

  :host .dialog::backdrop {
    background-color: rgba(0, 0, 0, 0.1);
  }

  :host .dialog[open] {
    opacity: 1;
    transform: scale(1);
  }

  :host .button {
    appearance: none;
    display: flex;
    justify-content: center;
    align-items: center;
    user-select: none;
    position: relative;
    white-space: nowrap;
    flex-grow: 1;
    height: 2rem;
    padding-inline-start: 0.75rem;
    padding-inline-end: 0.75rem;
    justify-content: center;
    border-width: 1px;
    border-style: solid;
    border-color: var(--bucket-feedback-dialog-border-color, #cfd0d8);
    cursor: pointer;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.06), 0 1px 1px 0 rgba(0, 0, 0, 0.01);
    border-radius: 6px;
  }

  :host .button.primary {
    color: var(--bucket-feedback-dialog-primary-fg, white);
    border-color: var(--bucket-feedback-dialog-primary-border, #d8d9df);
    background-color: var(--bucket-feedback-dialog-primary-bg, #655bfa);
  }

  :host .form-control {
    display: flex;
    flex-direction: column;
    gap: 0.5em;
    border: none;
    padding: 0;
    margin: 0;
    margin-bottom: 1rem;
  }

  :host .invalid {
    border-color: var(--bucket-feedback-error-color, #e53e3e);
  }

  :host .error {
    color: var(--bucket-feedback-error-color, #e53e3e);
  }

  :host .plug {
    margin-top: 1rem;
    text-align: center;
  }

  :host .radio-group {
    display: flex;
  }

  :host .radio-group > input {
    border: 0px;
    clip: rect(0px, 0px, 0px, 0px);
    height: 1px;
    width: 1px;
    margin: -1px;
    padding: 0px;
    overflow: hidden;
    white-space: nowrap;
    position: absolute;
  }

  :host .radio-group > .button:not(:first-of-type) {
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
  }

  :host .radio-group > .button:not(:last-of-type) {
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
    margin-inline-end: -1px;
  }

  :host .radio-group > .button > svg {
    transition: transform 200ms ease-in-out;
  }

  :host .radio-group > .button:hover {
    background-color: #e9e9ed;
  }

  :host .radio-group > .button:hover > svg {
    transform: scale(1.2);
  }

  :host .radio-group > input:checked + .button {
    background-color: #e9e9ed;
  }

  :host .radio-group > input:checked + .button > svg {
    transform: scale(1.2);
  }
`;
