import { cac } from 'cac';
import { registerCoverageCommand } from './commands/coverage';
import { registerDocCommand } from './commands/doc';
import { registerInitCommand } from './commands/init';
import { registerVerifyCommand } from './commands/verify';

const cli = cac('seizu');

registerInitCommand(cli);
registerDocCommand(cli);
registerVerifyCommand(cli);
registerCoverageCommand(cli);

cli.help();
cli.version('2.0.0');
cli.parse();
