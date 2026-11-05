Makes projects and workspaces easy to tell apart in the sidebar. Project names are bigger and bold. Each project's workspaces are indented and smaller, with a coloured rail on their left. The rail takes the colour of the project's letter avatar. A project with an image icon gets a colour picked from its name, so the colour stays the same between sessions.

The plugin adds a stylesheet to the app and targets the sidebar's test IDs. Paseo does not offer a plugin API for the sidebar, so a Paseo release that renames those IDs stops the styling until the plugin is updated. Nothing breaks when that happens; the sidebar just looks like the default again.

It works in the desktop and web apps. The mobile app has no stylesheet to change, so it shows the default sidebar. The styling only applies when the sidebar is grouped by project. The plugin has no settings, reads nothing outside the app, and sends nothing anywhere.
