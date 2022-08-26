# Template Pig
Create and use simple to complex file/folder templates leveraging [JavaScript template literals](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals).

## Features
Animated GIF and description coming "soon."

## Create a template
Let’s walk through making a very simple single-file template.

- In the `{root}` folder of your VS Code workspace, create a folder named `.templates`.
- Create a subfolder named whatever you like. For example, `Documentation`.
- Create a file named `.pig.js` in your subfolder.
- Create a file named `Document.md` in your subfolder.
- Paste this into `{root}/.templates/Documentation/.pig.js`:
```js
// Metadata used when picking a template.
pig.name = 'Markdown document'
pig.description = '(.md)'
pig.detail = 'Add documentation to this project.'

// Executed when this user is selected by the user, or if the
// .templates folder only has a single template.
pig.executeAsync = async () => {
  // Use VS Code API to prompt user about how they’d like to customize this template instance.
  const title = await showInputBox({ 
    title: 'What are you documenting?', 
    placeHolder: 'Title', 
    prompt: 'Should be singular'
  })
  if (!title) return // Returning a falsy value (undefined here) aborts template instantiation.
  return { title }

  const sectionOptions = [ prepicked('Features'), prepicked('Settings'), prepicked('Known issues') ]
  const selectedSections = await showQuickPick(baseClassOptions, { title: 'Which sections would you like?', canPickMany: true })
  if (!selectedSections) return

  const sections = toPickedKeys(selectedSections)

  return { title, sections }
}
```
- Notice there are several variables globally available, but ignore that for now. More on that below.
- Paste this into `{root}/.templates/Documentation/Document.md`:
```md
# ${title}

${sections.Features ? '## Features\n- ' : ''}

${sections.Settings ? '## Settings\n- ' : ''}

${sections.KnownIssues ? '## Known issues\n- ' : ''}
```
- Notice we’re using [JavaScript template literals](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals) syntax to interpolate values from the *context* returned from `pig.executeAsync(…)` (they’re available globally).
- Also note that of course this document will result in a bunch of whitespace if a `sectionOptions` option is unselected. That’s up to you to make your rendered template pretty.

## Use a template
- In VS Code, right-click a folder (or your workspace root) and select `Template Pig: Use template`.
  - If you only have one template, it’ll begin executing.
  - If you have more than one template, you’ll be prompted to select one.
- The selected template will then call its `pig.executeAsync(…)` method, which may prompt you for additional information.
- After that, each file in the template subfolder will be rendered with the *context* value returned from `pig.executeAsync(…)`.
- After all template files have been rendered, they’ll be saved to disk.
  - Well, there is one step before that. More on that below.

## Setting a template file/folder’s destination path
So far you’ve seen being able to right-click a folder and instantiate your template there. But, what if you want some files to wind up there, but others need to go in specific places in your project? That’s where `pig.getDestinationPath(…)` comes in! Just add something like this in your `.pig.js` file:
```js
// Executed after all files were rendered to determine where to save them to.
pig.getDestinationPath = (sourcePath, context, paths) => {
  // `sourcePath` will be relative to this template subfolder (no leading forward slash).
  // `context` is the value your `pig.executeAsync(…)` returned.
  // `paths.workspaceUri` is your project’s root directory.
  // `paths.targetUri` is where the template was instantiated (typically which folder was right-clicked).
  // Keep in mind this `switch`’s `case`s are case-sensitive!
  switch (sourcePath) {
    // Here we’re creating a subfolder "docs" within the folder the user right-clicked.
    // We’re also renaming the file to something more descriptive.
    case 'Document.md': return `docs/${context.title}.md`
    // Here the leading forward slash tells Template Pig to place the file relative
    // to the workspace root. You’ll also notice we have Lodash available to our disposal!
    case 'Test.js': return `/tests/${_.kebabCase(context.name)}.test.js`
    // You can return any falsy value to omit a file from being written to disk.
    // Typically you’d prompt the user in your `pig.executeAsync(…)` method, and then turn something
    // off based on their response.
    case 'MaybeIncluded.js': return context.shouldIncludeMaybeIncluded ? sourcePath : false
    // Otherwise, just plop it relative to the target (where the user right-clicked).
    default: return sourcePath
  }
}
```

## Empty folders
You can also put empty folders in your template. They follow the same rules as files in `pig.getDestinationPath(…)`:
- They can be placed relative to the target.
- They can be placed relative to the workspace root.
- They can be renamed! This also means you can make a template-root-level folder actually be nested several folders deep; you just need a placeholder to tell Template Pig to ask about it in `pig.getDestinationPath(…)`.
- Do note that `git` and some other version control systems (VCS) will not version this folder.
  - To work around this, you can add an empty `.pignore` or `.pigignore` file to the directory.

## More on `.pig.js`
- `pig.name`, `pig.detail`, and `pig.description` are used to describe your template when the user is prompted about which template they’d like to instantiate.
  - `pig.name` is defaulted to the sentence-case version of your folder; you don’t have to set it!
  - `pig.detail` is put next to `pig.name` in a dimmer text. It may be cropped, but hovering it will reveal the entirety of the text.
  - `pig.description` is like `pig.detail` in all ways except it’s put below `pig.name`.
- Several useful libraries and functions are injected and available globally.
  - [Lodash](https://lodash.com), available as the traditional `_`.
  - [change-case](https://github.com/blakeembrey/change-case) (both core and some of the more useful non-core functions), available globally:
    - `camelCase()`
    - `capitalCase()`
    - `constantCase()`
    - `dotCase()`
    - `headerCase()`
    - `isLowerCase()`
    - `isUpperCase()`
    - `localeLowerCase()`
    - `localeUpperCaseFirst()`
    - `lowerCase()`
    - `lowerCaseFirst()`
    - `noCase()`
    - `paramCase()`
    - `pascalCase()`
    - `pathCase()`
    - `sentenceCase()`
    - `snakeCase()`
    - `titleCase()`
    - `upperCase()`
    - `upperCaseFirst()`
      - Basically, no `swapCase()` or `spongeCase()`.
  - [`pluralize`](https://github.com/plurals/pluralize), available without needing the prefix `pluralize.` (i.e. these functions are global)
    - `addIrregularRule()`
    - `addPluralRule()`
    - `addSingularRule()`
    - `addUncountableRule()`
    - `isPlural()`
    - `isSingular()`
    - `plural()`
    - `singular()`
  - From VS Code API:
    - [`showQuickPick()`](https://code.visualstudio.com/api/references/vscode-api#QuickPick<T>)
    - [`showInputBox()`](https://code.visualstudio.com/api/references/vscode-api#InputBox)
  - Template Pig specific:
    - `option(label)`
      - Builds an option object with the given `label`, and a `key` that’s the `pascalCase`-ified `label`.
      - The `key` is useful in combination with `toPickedKeys()` below.
    - `prepicked(label)`
      - Builds an option object like `option(label)` but also sets `picked: true`.
    - `toPickedKeys(array)`
      - Converts `[{ key: 'Foo' }, { key: 'Bar' }, { key: 'Baz' }]` to `{ Foo: true, Bar: true, Baz: true }`.
      - You likely will get an array similar to above when calling `showQuickPick(options, { canPickMany: true })`.
      - This is useful so your templates can simply `${selected.Foo ? 'Foo stuff' : ''}` instead of `selected.includes('Foo')`.

## Extension settings
This extension acknowledges the following settings:
- `templatePig.templatesPath`
  - The path for workspace-specific templates. 
  - Defaults to `".templates"`, which is effectively `"{root}/.templates"`.
* `templatePig.globalTemplatesPath`
  - The path for globally useful templates. 
  - Defaults to `null`.

## Known issues
- All rendered template files are opened after 1 second.
- Files are always overwritten without prompt.

## Release notes
### 0.0.1
Initial release of Template Pig.