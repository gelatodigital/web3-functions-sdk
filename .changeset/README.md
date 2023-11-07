# Releases

## Managing versions

After your changes on a specific branch is complete explain your changes in the changeset, to add a changeset utilize
the following command within your CLI;

```
$ yarn changeset
```

according to your code changes specifc either patch, minor or major. This selection will effect the versioning;

```
major.minor.patch --> 0.0.2
```

⚠️ Always include a changeset with your PRs

## Creating a release

Releases should require an intent from developer, thus if a new release is required to be created utilize

```
yarn changeset version
```

command, this will create a CHANGELOG file and update the version according to the changesets. All previous changesets will be removed and included with this release.

## Publishing the release

You must create a release before publishing it, i.e. utilize `yarn changeset version` command beforehand!

```
yarn changeset publish
```

to publish the release. Publish operations will require OTP.

‼️ For **pre-release** versions specify `--tag {tagname}`.

The versioning will work like this;

1. Create collection of PR changes with changesets included
2. Merge those changes, then create a version PR with `yarn changeset version`, utilize `git push --follow-tags`
3. Deploy your release to a beta, pre-release with `yarn changeset publish --tag betatest`
4. Test your release then publish it to `latest` with `yarn changeset publish`
