import * as vscode from 'vscode';
import * as os from 'os';

let statusBarItem: vscode.StatusBarItem;
let terminal: vscode.Terminal | undefined;

export function activate(context: vscode.ExtensionContext) {
    console.log('OpenClaw extension is now active');

    // Create status bar item
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'openclaw.showMenu';
    statusBarItem.text = '$(hubot) OpenClaw';
    statusBarItem.tooltip = 'Click to show OpenClaw menu';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    // Register menu command
    let menuCommand = vscode.commands.registerCommand('openclaw.showMenu', async () => {
        const selection = await vscode.window.showInformationMessage(
            "Connect to OpenClaw? Make sure your openclaw is ready.",
            "Status",
            "Onboard",
            "Gateway",
            "Terminal",
            "Dashboard"
        );

        if (selection) {
            const commandMap: { [key: string]: string } = {
                'Status': 'openclaw status',
                'Onboard': 'openclaw onboard',
                'Gateway': 'openclaw gateway',
                'Terminal': 'openclaw tui',
                'Dashboard': 'openclaw dashboard'
            };
            const command = commandMap[selection];
            if (command) {
                await runOpenClawCommand(context, command);
            }
        }
    });
    context.subscriptions.push(menuCommand);

    // Check auto-connect setting
    const config = vscode.workspace.getConfiguration('openclaw');
    const autoConnect = config.get<boolean>('autoConnect', false);

    if (autoConnect) {
        // Auto-connect on startup (runs status)
        setTimeout(() => {
            runOpenClawCommand(context, 'openclaw status');
        }, 1000); // Small delay to ensure everything is initialized
    }

    // Listen for terminal close events
    vscode.window.onDidCloseTerminal((closedTerminal) => {
        if (terminal && closedTerminal === terminal) {
            terminal = undefined;
            statusBarItem.text = '$(hubot) OpenClaw';
            statusBarItem.tooltip = 'Click to show OpenClaw menu';
        }
    });
}

async function runOpenClawCommand(context: vscode.ExtensionContext, command: string) {
    try {
        if (command === 'openclaw status') {
            // Update status to connecting for status command
            statusBarItem.text = '$(sync~spin) Connecting...';
            statusBarItem.tooltip = 'Connection in progress';
        }

        // Detect OS
        const platform = os.platform();
        const isWindows = platform === 'win32';

        // Create or reuse terminal
        if (!terminal) {
            const iconPath = vscode.Uri.joinPath(context.extensionUri, 'assets', 'images', 'logo.svg');
            if (isWindows) {
                terminal = vscode.window.createTerminal({
                    name: 'OpenClaw',
                    shellPath: 'wsl.exe',
                    shellArgs: ['-d', 'Ubuntu'],
                    iconPath: iconPath
                });
            } else {
                terminal = vscode.window.createTerminal({
                    name: 'OpenClaw',
                    iconPath: iconPath
                });
            }
        }

        // Show terminal and send command
        terminal.show(true); // true = preserve focus
        terminal.sendText(command);

        if (command === 'openclaw status') {
            // Update status to connected after sending status command
            statusBarItem.text = '$(check) OpenClaw';
            statusBarItem.tooltip = 'Connected to OpenClaw';
            vscode.window.showInformationMessage('OpenClaw Status Command Sent');
        }
    } catch (error) {
        statusBarItem.text = '$(hubot) OpenClaw';
        statusBarItem.tooltip = 'Click to show OpenClaw menu';
        vscode.window.showErrorMessage(`Failed to execute ${command}: ${error}`);
    }
}

export function deactivate() {
    if (terminal) {
        terminal.dispose();
    }
}
