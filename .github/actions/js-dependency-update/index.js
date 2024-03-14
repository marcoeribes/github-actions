const core = require("@actions/core");
const exec = require("@actions/exec");
const github = require("@actions/github");

const validateBranchName = ({ branchName }) =>
  /^[a-zA-Z0-9_\-\.\/]+$/.test(branchName);
const validateDirectoryName = ({ dirName }) =>
  /^[a-zA-Z0-9_\-\.\/]+$/.test(dirName);

const setupLogger = ({ debug, prefix } = { debug: false, prefix: "" }) => ({
  debug: () => {
    if (debug) {
      core.info(`DEBUG ${prefix}${prefix ? " : " : ""}${message}`);
    }
  },
  error: () => {
    core.error(`${prefix}${prefix ? " : " : ""}${message}`);
  },
});

async function run() {
  const baseBranch = core.getInput("base-branch", { required: true });
  const targetBranch = core.getInput("target-branch", { required: true });
  const ghToken = core.getInput("gh-token", { required: true }); // secret
  const workingDir = core.getInput("working-directory", { required: true });
  const debug = core.getBooleanInput("debug");
  const logger = setupLogger({ debug, prefix: `[js-dependency-update]` });

  const commonExecOpts = {
    cwd: workingDir,
  };

  core.setSecret(ghToken);

  logger.debug("Validating input: base-branch, head-branch, working-directory");
  if (!validateBranchName({ branchName: baseBranch })) {
    core.setFailed(
      "Invalid base branch name. Branch names should include only characters, numbers, hyphens, underscores, and forward slashes"
    );
    return;
  }

  if (!validateBranchName({ branchName: targetBranch })) {
    core.setFailed(
      "Invalid target-branch name. Branch names should include only characters, numbers, hyphens, underscores, and forward slashes"
    );
    return;
  }

  if (!validateDirectoryName({ dirName: workingDir })) {
    core.setFailed(
      "Invalid working directory name. Branch names should include only characters, numbers, hyphens, underscores, and forward slashes"
    );
    return;
  }

  logger.debug(`base branch is ${baseBranch}`);
  logger.debug(`target branch is ${targetBranch}`);
  logger.debug(`working directory is ${workingDir}`);

  await exec.exec("npm update", [], {
    ...commonExecOpts,
  });

  const gitStatus = await exec.getExecOutput(
    "git status -s package*.json",
    [],
    { ...commonExecOpts }
  );

  if (gitStatus.stdout.length > 0) {
    logger.debug("There are updates available!");
    await exec.exec(`git config --global user.name "gh-automation`);
    await exec.exec(`git config --global user.email "gh-automation@email.com`);
    await exec.exec(`git checkout -b ${targetBranch}`, [], {
      ...commonExecOpts,
    });
    await exec.exec(`git add package.json package-lock.json`, [], {
      ...commonExecOpts,
    });
    await exec.exec(`git commit -m "chore: update dependencies"`, [], {
      ...commonExecOpts,
    });
    await exec.exec(`git push -u origin ${targetBranch} --force`, [], {
      ...commonExecOpts,
    });

    const octokit = github.getOctokit(ghToken);

    try {
      await octokit.rest.pulls.create({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        title: `Update npm dependencies`,
        body: `This pull request update NPM packages`,
        base: baseBranch,
        head: targetBranch,
      });
    } catch (e) {
      core.warning(
        `[js-dependency-update]: Something went wront while creating the PR. Check logs below.`
      );
      core.warning(e.message);
      core.warning(e);
    }
  } else {
    core.info("[js-dependency-update] : No updates at this point");
  }

  /*
  1. Parse inputs:
    1.1 base-branch from which to check for updates
    1.2 target-branch to use to create the PR
    1.3 Github Token for authentication purposes (to create PRs)
    1.4 Working directory for which to check for dependencies
  2. Execute the npm update command within the working directory
  3. Check whether there are modified package*.json files
  4. If there are modified files:
    4.1 Add and commit files to the target-branch
    4.2 Create a PR to the base-branch using the octokit API
  5. Otherwise, conclude the custom action
  */
  core.info("I am a custom JS action");
}

run();
