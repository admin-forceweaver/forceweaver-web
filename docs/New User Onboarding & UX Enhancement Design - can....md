# **New User Onboarding & UX Enhancement Design**

Project: Rev Cloud Blueprint  
Phase: Public Beta (Release 1.1)  
Goal: To solve the "empty state" problem for new users (especially QA) and provide a clear, guided onboarding experience to get them to their first successful test run.

### **Overview**

Currently, when a new user installs the extension and clicks the Activity Bar icon, they are presented with an empty test tree \[cite: image\_49f659.png\]. This is efficient for experts but confusing for new users, as it provides no guidance on how to start.

The solution is to create a dedicated **"Welcome Screen" view** that serves as the default screen for the extension. This view will act as a simple onboarding guide and a clear starting point for all user actions.

### **1\. The "Welcome Screen" View (New Default Screen)**

Instead of showing the test tree by default, we will register a new webviewView that displays rich, guided content. This view will be the *first thing* a user sees in the Rev Cloud Blueprint sidebar.

#### **Requirement**

The extension's sidebar will now consist of two views: revCloudBlueprint.welcomeView (the new webview) and revCloudBlueprint.treeView (the existing test explorer tree). By default, only the welcomeView will be visible. The treeView will become visible only after the user clicks "Done" on the welcome screen, or when they toggle it.

#### **Technical Design & Solution**

1. **Register Both Views:** In apps/vscode-extension/package.json, update the contributes.views section. We will rename the existing view to revCloudBlueprint.treeView and add the new revCloudBlueprint.welcomeView.  
   "contributes": {  
     "views": {  
       "revcloud-blueprint-container": \[  
         {  
           "id": "revCloudBlueprint.welcomeView",  
           "type": "webview",  
           "name": "Welcome",  
           "when": "\!revCloudBlueprint.treeViewVisible"  
         },  
         {  
           "id": "revCloudBlueprint.treeView",  
           "type": "tree",  
           "name": "Test Explorer",  
           "when": "revCloudBlueprint.treeViewVisible"  
         }  
       \]  
     },  
     // ... rest of package.json  
   }

2. **Control Visibility with Context:**  
   * We will use a new context key, revCloudBlueprint.treeViewVisible.  
   * In apps/vscode-extension/src/extension.ts \[cite: revcloud-blueprint-extension/src/extension.ts\], during activation, set the default state to show the welcome/account view:  
     // In activate()  
     vscode.commands.executeCommand('setContext', 'revCloudBlueprint.treeViewVisible', false);

3. **Create the View Provider:**  
   * Create a new file, apps/vscode-extension/src/ui/WelcomeViewProvider.ts, to manage the content of the welcomeView webview.  
   * This provider will be responsible for rendering the HTML for the welcome screen.

### **2\. "Welcome Screen" View Content (Onboarding State)**

This webview's primary state is the onboarding screen, based on your design \[cite: image\_951dff.png\].

#### **Requirement**

The welcomeView webview must render an onboarding state by default. This state serves as the welcome and onboarding guide, clearly explaining the purpose of the tool and how to get started.

#### **Technical Design & Solution**

1. **Implement WelcomeViewProvider.ts:**  
   * This class will implement vscode.WebviewViewProvider.  
   * Its resolveWebviewView method will be responsible for setting the HTML content.  
2. **Webview HTML Content:** The HTML must be styled using VS Code theme variables for a native look and feel. It must contain:  
   * **Logo:** The beaker logo (images/logo.png) \[cite: revcloud-blueprint-extension/images/logo.png\].  
   * **Headline:** "Welcome to Rev Cloud Blueprint\!"  
   * **Beta Notice:** A short message: "You are currently in the free Public Beta. All features are enabled."  
   * **Onboarding Text:** The key text: "Get started by creating your first pricing snapshot using the \+ button in the main view."  
   * **"Done" Button:** A "Done" button at the top, as shown in your screenshot \[cite: image\_951dff.png\].  
3. **Action Handling (Communicating from Webview to Extension):**  
   * The webview's JavaScript will use vscode.postMessage() to communicate with the extension.  
   * **"Done" Button:** When clicked, it must send a message: vscode.postMessage({ command: 'done' }).  
   * The WelcomeViewProvider.ts will listen for this message:  
     // Inside resolveWebviewView  
     webviewView.webview.onDidReceiveMessage(async (message) \=\> {  
       switch (message.command) {  
         case 'done':  
           // Switch to the test tree view  
           await vscode.commands.executeCommand('setContext', 'revCloudBlueprint.treeViewVisible', true);  
           break;  
       }  
     });

### **3\. The "Welcome" Icon (The Toggle)**

The user icon in the title bar now needs to reliably toggle between the test tree and the welcome view.

#### **Requirement**

The $(account) icon in the title bar of the treeView \[cite: image\_49f659.png\] and the "Done" button in the welcomeView will work together to toggle visibility.

#### **Technical Design & Solution**

1. **Create a General-Purpose Command:**  
   * In apps/vscode-extension/src/extension.ts \[cite: revcloud-blueprint-extension/src/extension.ts\], register a new command revCloudBlueprint.toggleWelcomeScreen.  
   * This command will simply toggle the revCloudBlueprint.treeViewVisible context.  
     // In activate()  
     vscode.commands.registerCommand('revCloudBlueprint.toggleWelcomeScreen', () \=\> {  
       // Get the current state  
       const current \= vscode.workspace.getConfiguration().get('revCloudBlueprint.treeViewVisible', false);  
       // Toggle it  
       vscode.commands.executeCommand('setContext', 'revCloudBlueprint.treeViewVisible', \!current);  
     });

2. **Add the Icon to the treeView:**  
   * In apps/vscode-extension/package.json \[cite: revcloud-blueprint-extension/package.json\], add the $(account) icon to the view/title menu for the **treeView**. We will give it a more neutral name for the beta.

"contributes": {  
  "commands": \[  
    {  
      "command": "revCloudBlueprint.toggleWelcomeScreen",  
      "title": "Rev Cloud Blueprint: Show Welcome Screen",  
      "icon": "$(account)"  
    },  
    // ... other commands  
  \],  
  "menus": {  
    "view/title": \[  
      {  
        "command": "revCloudBlueprint.toggleWelcomeScreen",  
        "when": "view \== revCloudBlueprint.treeView",  
        "group": "navigation@1"  
      },  
      // ... other icons  
    \]  
  }  
}

### **4\. Quick Wins: Improve Discoverability**

This is a low-effort, high-impact change to improve usability for all users.

#### **Requirement**

All commands contributed by the extension must be clearly named and discoverable in the VS Code Command Palette (Ctrl+Shift+P). All icons must have clear tooltips.

#### **Technical Design & Solution**

1. **Update package.json:**  
   * Go to the contributes.commands section in apps/vscode-extension/package.json \[cite: revcloud-blueprint-extension/package.json\].  
   * **Prefix all title properties** with **"Rev Cloud Blueprint:"**. This makes them easy to find in the Command Palette.  
   * This change will also automatically update the tooltips for all icons in the view/title menu.

**Example (Before):**{  
  "command": "revCloudBlueprint.createPricingSnapshot",  
  "title": "Create Pricing Snapshot",  
  "icon": "$(add)"  
}  
**Example (After):**{  
  "command": "revCloudBlueprint.createPricingSnapshot",  
  "title": "Rev Cloud Blueprint: Create New Pricing Snapshot",  
  "icon": "$(add)"  
}  
