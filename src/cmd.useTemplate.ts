import _ from './utils.lodash'
import { createTemplateContents, getGlobalTemplatePath, getLocalTemplatePath, getTargetPath, getWorkspaceUri, showError, showInfo } from './utils.vscode'
import { getAvailableTemplates, pickTemplate } from './utils.extension'
import { getFolderContents, getRelativePath, isExistingDirectory } from './utils.fs'
import * as vm from 'node:vm'
import * as vscode from 'vscode'

export default async (resource: vscode.Uri | string | undefined) => {
  try {
    const workspaceUri = await getWorkspaceUri()
    const targetUri = await getTargetPath(resource, workspaceUri)
    const templatePaths = [await getLocalTemplatePath(targetUri), await getGlobalTemplatePath()]
    const validPaths = templatePaths.filter(isExistingDirectory)
    const templates = (await Promise.all(validPaths.map(async (path) => await getAvailableTemplates(path)))).flat()
    if (!templates.length) return showError('No templates found!')
    const template = await pickTemplate(templates)
    if (!template) return showInfo('No template selected')
    const paths = { workspaceUri, targetUri }
    const context = await template.context.pig.executeAsync(paths)
    if (!context) return showInfo('Aborted')
    const templateContents = getFolderContents(template.path)

    // Process templateContents twice:
    // - First to get destination file paths (or if a file should be skipped)
    // - Second to render templates
    // - Third to save files/folders and open them
    for (const item of templateContents) {
      if (item.uri.fsPath.toLowerCase().endsWith('.pig.js')) {
        item.skip = true
        continue
      }
      item.sourcePath = getRelativePath(template.path, item.uri)
      item.destinationPath = template.context.pig.getDestinationPath(item.sourcePath, context, paths)
      if (!item.destinationPath) {
        item.skip = true
        continue
      }
      item.absoluteDestinationFilePath = vscode.Uri.joinPath(item.destinationPath.startsWith('/') ? workspaceUri : targetUri, item.destinationPath)
    }

    for (const item of templateContents) {
      if (item.skip || item.type === 'dir') continue
      const thisTemplateContext = vm.createContext(_.cloneDeep(_.omit(context, 'pig')))
      item.renderedContent = vm.runInContext(`(() => \`${item.content}\`)()`, thisTemplateContext)
    }

    await createTemplateContents(templateContents.filter(item => !item.skip))
  } catch (ex) {
    console.log('Uncaught Template Pig exception:', ex)
  }

  return 'done'
}