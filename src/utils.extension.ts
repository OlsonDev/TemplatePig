import { addIrregularRule, addPluralRule,  addSingularRule, addUncountableRule, isPlural, isSingular, plural, singular } from 'pluralize'
import { existsSync, readdirSync } from 'node:fs'
import { getFileContent } from './utils.fs'
import { showInfo } from './utils.vscode'
import * as _ from 'lodash'
import * as $ from './utils.change-case'
import * as vm from 'node:vm'
import * as vscode from 'vscode'

const getTemplateContext = (name: string, templatePath: vscode.Uri): any => {
  const ctx = vm.createContext({
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
    pig: {
      name: $.sentenceCase(name),
      detail: null,
      description: null,
      execute: (paths) => ({}),
      getDestinationPath: (sourceFilePath, context, paths) => sourceFilePath,
    },
  })

  if (!existsSync(templatePath.fsPath)) return ctx
  try {
    const script = getFileContent(templatePath)
    if (!script) return ctx
    vm.runInContext(script, ctx)
    return ctx
  } catch (ex) {
    showInfo(`Error running script: ${templatePath.fsPath}:\n${ex}`)
  }
}

export const getAvailableTemplates = async (templatesPath: vscode.Uri) => {
  const templates = readdirSync(templatesPath.fsPath, { withFileTypes: true })
  return (await Promise.all(templates
    .map(async (dirent) => {
      if (!dirent.isDirectory()) return null
      const path = vscode.Uri.joinPath(templatesPath, dirent.name)
      const context = getTemplateContext(dirent.name, vscode.Uri.joinPath(path, '.pig.js'))
      return { path, context }
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