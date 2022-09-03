import { addIrregularRule, addPluralRule, addSingularRule, addUncountableRule, isPlural, isSingular, plural, singular } from 'pluralize'
import { existsSync, readdirSync } from 'node:fs'
import { getFileContent, getFolderContents, getRelativePath, toFileUri } from './utils.fs'
import { showException } from './utils.vscode'
import * as _ from 'lodash'
import * as $ from './utils.change-case'
import * as vm from 'node:vm'
import * as vscode from 'vscode'

const outputChannel = vscode.window.createOutputChannel('Template Pig', 'md')

export const createContext = (extra = {}) => vm.createContext({
  _,
  ...$,
  addIrregularRule,
  addPluralRule,
  addSingularRule,
  addUncountableRule,
  isPlural,
  isSingular,
  plural,
  singular,
  option: label => ({ label, key: $.pascalCase(label) }),
  prepicked: label => ({ label, key: $.pascalCase(label), picked: true }),
  toPickedKeys: array => Object.assign({}, ...array.map(item => ({ [item.key ?? item.label]: true }))),
  showQuickPick: vscode.window.showQuickPick,
  showInputBox: vscode.window.showInputBox,
  getFileContent,
  getFolderContents,
  getRelativePath,
  toFileUri,
  /* eslint-disable @typescript-eslint/naming-convention */
  Uri: vscode.Uri,
  QuickPickItemKind: vscode.QuickPickItemKind,
  QuickInputButtons: vscode.QuickInputButtons,
  /* eslint-enable @typescript-eslint/naming-convention */
  ...extra,
})

const getTemplateContext = (name: string, pigJsUri: vscode.Uri): any => {
  const ctx = createContext({
    log: value => outputChannel.appendLine(`${ctx.pig.name}: ${value}`),
    pig: {
      name: $.sentenceCase(name),
      detail: null,
      description: null,
      executeAsync: (paths) => ({}),
      getDestinationPath: (entry, context, paths) => entry.sourcePath,
    },
  })

  if (!existsSync(pigJsUri.fsPath)) return ctx
  try {
    const script = getFileContent(pigJsUri)
    if (!script) return ctx
    vm.runInContext(script, ctx)
    return ctx
  } catch (ex) {
    showException(ex, name, `getting metadata from template`, pigJsUri)
    return
  }
}

export const getAvailableTemplates = async (templatesUri: vscode.Uri) => {
  const templates = readdirSync(templatesUri.fsPath, { withFileTypes: true })
  return (await Promise.all(templates
    .map(async (dirent) => {
      if (!dirent.isDirectory()) return null
      const uri = vscode.Uri.joinPath(templatesUri, dirent.name)
      const pigJsUri = vscode.Uri.joinPath(uri, '.pig.js')
      const context = getTemplateContext(dirent.name, pigJsUri)
      return { uri, name: dirent.name, pigJsUri, context }
    })))
    .filter(Boolean)
}

export const pickTemplate = async (templates) => {
  if (!templates.length) return null
  if (templates.length === 1) return templates[0]
  const items = templates.map(template => {
    const { pig } = template.context
    return {
      template,
      label: pig.name,
      detail: pig.detail,
      description: pig.description,
    }
  })
  const picked = await vscode.window.showQuickPick<any>(items, { title: 'Which template would you like to use?', placeHolder: 'Pick a template' })
  return picked?.template ?? null
}