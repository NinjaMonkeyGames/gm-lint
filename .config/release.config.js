export default 
{
  branches: 
  [
    'master',
    { name: 'develop', prerelease: 'beta' },
    { name: 'release', prerelease: 'rc' },
  ],
  plugins: [
    // 1. Analyze commits (Needs @semantic-release/commit-analyzer)
    '@semantic-release/commit-analyzer',
    // 2. Generate Release Notes (Needs @semantic-release/release-notes-generator)
    [
      '@semantic-release/release-notes-generator',
      {
        preset: 'conventionalcommits',
        parserOpts: {
          noteKeywords: ['BREAKING CHANGE', 'BREAKING CHANGES', 'IMPORTANT'],
        },
        writerOpts: {
          transform: (commit) =>
          {
            if (commit.committerDate && !(commit.committerDate instanceof Date))
            {
              commit.committerDate = new Date(commit.committerDate);
            }
            const newCommit = {
              ...commit,
              subject: commit.subject,
              body: commit.body,
              footer: commit.footer,
            };
            if (commit.body)
            {
              newCommit.notes = (newCommit.notes || []).concat({
                title: 'Details',
                text: commit.body,
              });
            }
            return newCommit;
          },
        },
      },
    ],
    // 3. Update Changelog (Needs @semantic-release/changelog)
    '@semantic-release/changelog',
    // 4. Update package.json version (Needs @semantic-release/npm)
    [
      '@semantic-release/npm',
      {
        npmPublish: false,
        updatePackageJson: true,
      },
    ],
    // 5. Commit changes back to Git (Needs @semantic-release/git)
    [
      '@semantic-release/git',
      {
        assets: ['package.json', 'CHANGELOG.md'],
        message: 'chore(release): ${nextRelease.version} [skip ci]',
      },
    ],
    // 6. Create GitHub Release (Needs @semantic-release/github)
    '@semantic-release/github', 
  ],
};