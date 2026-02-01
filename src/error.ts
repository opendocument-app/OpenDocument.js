export const error_illegal_edit_new_line = {
  code: 1,
  message: 'new line not supported by this document',
};

export let onError = (code: number, message: string) => {
  console.error(`error ${code} message ${message}`);
};
