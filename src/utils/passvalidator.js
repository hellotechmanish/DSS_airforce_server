const validatePassword = (password) => {
  const errors = [];
  if (!password || password.length < 8) {
    errors.push("Minimum 8 characters required");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("At least one uppercase letter required");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("At least one lowercase letter required");
  }
  if (!/\d/.test(password)) {
    errors.push("At least one number required");
  }
  if (!/[#?!@$%^&*-]/.test(password)) {
    errors.push("At least one special character required");
  }
  return {
    isValid: errors.length === 0,
    errors,
  };
};
export default validatePassword;
//# sourceMappingURL=passvalidator.js.map
