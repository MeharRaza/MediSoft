/**
 * Auto-Update Server Configuration
 *
 * 2 options:
 *
 * OPTION A — GitHub Releases (internet chahiye)
 *   publish:
 *     - provider: github
 *       owner: your-github-username
 *       repo: medisoft-pro
 *
 * OPTION B — Generic (LAN server, USB share, or any web server)
 *   publish:
 *     - provider: generic
 *       url: http://192.168.1.100/medisoft-updates
 *       (ya koi bhi URL jahan aap files rakhte hain)
 */

// This file is just documentation. Config is in package.json "publish" field.
// See README-UPDATES.md for setup instructions.

module.exports = {}
