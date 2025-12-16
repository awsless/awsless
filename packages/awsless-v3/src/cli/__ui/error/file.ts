import { Terminal } from '../../__lib/terminal.js'
import { style } from '../../ui/style.js'
import { dialog } from '../layout/dialog.js'
import { FileError } from '../../error.js'

export const fileError = (error: FileError) => {
	return (term: Terminal) => {
		term.out.gap()
		term.out.write(dialog('error', [style.error(error.message)]))
		term.out.write('  ' + style.placeholder(error.file))
		term.out.gap()
	}
}
