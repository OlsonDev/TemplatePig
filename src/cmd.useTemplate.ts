import { createTemplateContents, getGlobalTemplatePath, getLocalTemplatePath, getTargetUri, getWorkspaceUri, showError, showException, showInfo } from './utils.vscode'
import { getAvailableTemplates, pickTemplate } from './utils.extension'
import { getFolderContents, getRelativePath, isExistingDirectory } from './utils.fs'
import * as _ from 'lodash'
import * as vm from 'node:vm'
import * as vscode from 'vscode'


export default async (resource: vscode.Uri | string | undefined) => {
  try {
    const workspaceUri = await getWorkspaceUri()
    const targetUri = await getTargetUri(resource, workspaceUri)
    const templatePaths = [await getLocalTemplatePath(targetUri), await getGlobalTemplatePath()]
    const validPaths = templatePaths.filter(isExistingDirectory)
    const templates = (await Promise.all(validPaths.map(async (path) => await getAvailableTemplates(path)))).flat()
    if (!templates.length) return showError('No templates found!')
    const template = await pickTemplate(templates)
    if (!template) return showInfo('No template selected')
    const paths = { workspaceUri, targetUri }
    let context
    try {
      context = await template.context.pig.executeAsync(paths)
    } catch (ex) {
      return showException(ex, template.name, 'calling executeAsync(…)', template.pigJsUri)
    }
    if (!context) return showInfo('Aborted')
    const templateContents = getFolderContents(template.uri)

    // Process templateContents multiple times:
    // - First to get destination file paths (or if a file should be skipped)
    // - Second to render templates
    // - Third to save files/folders and open them
    const entries = []
    for await (const entry of templateContents) {
      entries.push(entry)
      entry.sourcePath = getRelativePath(template.uri, entry.uri)
      try {
        // Pluck a few properties so they can't mutate the item itself.
        const slimItem = {
          sourcePath: entry.sourcePath,
          dirent: entry.dirent,
          uri: entry.uri,
        }
        entry.destinationPath = template.context.pig.getDestinationPath(slimItem, context, paths)
      } catch (ex) {
        return showException(ex, template.name, `calling getDestinationPath("${entry.sourcePath.replace('"', '\\"')}", …)`, template.pigJsUri)
      }
      if (!entry.destinationPath) {
        entry.skip = true
        continue
      }
      entry.absoluteDestinationFilePath = vscode.Uri.joinPath(entry.destinationPath.startsWith('/') ? workspaceUri : targetUri, entry.destinationPath)
    }

    for (const entry of entries) {
      if (entry.skip || entry.dirent.isDirectory()) continue
      const thisTemplateContext = vm.createContext(_.cloneDeep(_.omit(context, 'pig')))
      try {
        entry.renderedContent = vm.runInContext(`(() => \`${entry.content}\`)()`, thisTemplateContext)
      } catch (ex) {
        return showException(ex, template.name, `rendering template ${entry.sourcePath}`, entry.uri)
      }
    }

    await createTemplateContents(entries.filter(entry => !entry.skip))
  } catch (ex) {
    console.log('Uncaught Template Pig exception:', ex)
  }

  return 'done'
}