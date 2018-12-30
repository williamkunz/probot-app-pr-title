/** Copyright (c) 2017 Uber Technologies, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const validateTitle = require('./validate-title.js');

module.exports = robot => {
  robot.on('pull_request.opened', check);
  robot.on('pull_request.edited', check);
  robot.on('pull_request.synchronize', check);

  async function check(context) {
    const pr = context.payload.pull_request;
    const errors = validateTitle(pr.title);
    await setComment(context, errors);
    await setStatus(context, errors);
  }
};

const setComment = async (context, errors) => {
  const {github} = context;

  const {owner, repo} = context.repo();
  const number = context.payload.pull_request.number;

  const format_errors = errors => {
    let formatted_errors = '';
    for (let error of errors) {
      formatted_errors += `* ${error}\n`;
    }

    return formatted_errors;
  };

  const body = `
This project enforces that PR titles are written in accordance with the rules of writing good commit messsages as outlined in https://chris.beams.io/posts/git-commit/.

Please fix the following errors with your PR title:
${format_errors(errors)}
`;

  if (errors.length !== 0) {
    await github.issues.createComment({owner, repo, number, body});
  }
};

const setStatus = async (context, errors) => {
  const {github} = context;

  const status =
    errors.length === 0
      ? {
          state: 'success',
          description: 'PR title is valid',
        }
      : {
          state: 'failure',
          description: 'PR title is invalid',
        };

  await github.repos.createStatus(
    context.repo({
      ...status,
      sha: context.payload.pull_request.head.sha,
      context: 'containershipbot/pr-title',
    }),
  );
};
