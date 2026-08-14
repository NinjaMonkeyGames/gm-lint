////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                        SIGNED-OFF-BY REGEX RULE [COMMITLINT]                                       //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/* This function is a custom commitlint plugin that will enforce the presence of a "Signed-off-by" line in commit messages, ensuring it follows a specific format. */

// 1. Export default.
// 2. Define Regex pattern to match the "Signed-off-by" line.
// 3. Check if the regex matches anywhere in the commit message.
// 4. Return error.

// Export Default

export default
{
  rules:
  {
    /**
     * Custom commitlint rule to ensure a "Signed-off-by" line is present in the correct format.
     * @author                        NinjaMonkeyGames
     * @since                         0.1.0
     * @version                       0.1.0
     * @see                           https://example-to-come.htm
     * @description                 - This rule enforces the format: "Signed-off-by: Name <email@example.com>"
     * @param {object} params       - Parameters provided by commitlint.
     * @param {string} params.raw   - The raw commit message.
     * @returns {Array}             - Returns [true] if valid or [false, error message] if invalid.
     */

    'signed-off-by-regex': ({ raw }) =>
    {
      // Define Regex pattern to match the "Signed-off-by" line

      const signoffRegex = /^Signed-off-by: .+ <.+@.+\..+>$/m;

      // Check if the regex matches anywhere in the commit message
      
      if (signoffRegex.test(raw))
      {
        return [true];
      }

      // Return an error if the "Signed-off-by" line is missing or malformed

      return [
        false,
        'Commit message must contain a "Signed-off-by" line in the format: "Signed-off-by: Name <email@example.com>"',
      ];
    },
  },
};
