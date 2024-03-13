const core = require("@actions/core");

async function run() {
  /*
  1. Parse inputs:
    1.1 base-branch from which to check for updates
    1.2 target-branch to use to create the PR
    1.3 Github Token for authentication purposes (to create PRs)
    1.4 Working directory for which to check for dependencies
  2. Execute the npm update command within the working directory
  3. Check whether there are modified package*.json files
  4. If there are modified files:
    4.1 create a PR to the base-branch using the target-branch
    3.2 Otherwise, conclude the custom action
  */
  core.info("I am a custom JS action");
}

run();
