/**
 * Core UI functions are initialized in this file. This prevents
 * unexpected errors from breaking the core features. Specifically,
 * actions in this file should not require the usage of any internal
 * modules, excluding dependencies.
 */
// Requirements
const $                              = require('jquery')
const {ipcRenderer, shell, webFrame} = require('electron')
const remote                         = require('@electron/remote')
const isDev                          = require('./assets/js/isdev')
const { LoggerUtil }                 = require('demciak-core')
const Lang                           = require('./assets/js/langloader')

const loggerUICore             = LoggerUtil.getLogger('UICore')
const loggerAutoUpdater        = LoggerUtil.getLogger('AutoUpdater')

// Log deprecation and process warnings.
process.traceProcessWarnings = true
process.traceDeprecation = true

// Disable eval function.
window.eval = global.eval = function () {
    throw new Error('Sorry, this app does not support window.eval().')
}

// Display warning when devtools window is opened.
remote.getCurrentWebContents().on('devtools-opened', () => {
    console.log('%cThe console is dark and full of terrors.', 'color: white; -webkit-text-stroke: 4px #a02d2a; font-size: 60px; font-weight: bold')
    console.log('%cIf you\'ve been told to paste something here, you\'re being scammed.', 'font-size: 16px')
    console.log('%cUnless you know exactly what you\'re doing, close this window.', 'font-size: 16px')
})

// Disable zoom, needed for darwin.
webFrame.setZoomLevel(0)
webFrame.setVisualZoomLevelLimits(1, 1)

// Initialize auto updates in production environments.
let updateCheckListener
let updatePromptVisible = false
let updateInstallPromptVisible = false
let updateDownloadVisible = false
if(!isDev){
    ipcRenderer.on('autoUpdateNotification', (event, arg, info) => {
        switch(arg){
            case 'checking-for-update':
                loggerAutoUpdater.info('Checking for update..')
                settingsUpdateButtonStatus(Lang.queryJS('uicore.autoUpdate.checkingForUpdateButton'), true)
                break
            case 'update-available':
                loggerAutoUpdater.info('New update available', info.version)
                populateSettingsUpdateInformation(info)
                settingsUpdateButtonStatus(Lang.queryJS('uicore.autoUpdate.downloadNowButton'), false, () => {
                    startUpdateDownload()
                })
                showUpdateAvailablePrompt(info)
                break
            case 'download-progress':
                updateDownloadProgress(info)
                break
            case 'update-downloaded':
                loggerAutoUpdater.info('Update ' + info.version + ' ready to be installed.')
                updateDownloadVisible = false
                settingsUpdateButtonStatus(Lang.queryJS('uicore.autoUpdate.installNowButton'), false, () => {
                    if(!isDev){
                        ipcRenderer.send('autoUpdateAction', 'installUpdateNow')
                    }
                })
                showUpdateInstallPrompt(info)
                break
            case 'update-not-available':
                loggerAutoUpdater.info('No new update found.')
                settingsUpdateButtonStatus(Lang.queryJS('uicore.autoUpdate.checkForUpdatesButton'))
                break
            case 'ready':
                updateCheckListener = setInterval(() => {
                    ipcRenderer.send('autoUpdateAction', 'checkForUpdate')
                }, 1800000)
                ipcRenderer.send('autoUpdateAction', 'checkForUpdate')
                break
            case 'realerror':
                if(updateDownloadVisible){
                    setOverlayContent(
                        Lang.queryJS('uicore.autoUpdate.downloadErrorTitle'),
                        Lang.queryJS('uicore.autoUpdate.downloadErrorMessage'),
                        Lang.queryJS('uicore.autoUpdate.closeButton')
                    )
                    setOverlayHandler(() => {
                        toggleOverlay(false)
                    })
                    document.getElementById('overlayAcknowledge').disabled = false
                }
                updateDownloadVisible = false
                if(info != null && info.code != null){
                    if(info.code === 'ERR_UPDATER_INVALID_RELEASE_FEED'){
                        loggerAutoUpdater.info('No suitable releases found.')
                    } else if(info.code === 'ERR_XML_MISSED_ELEMENT'){
                        loggerAutoUpdater.info('No releases found.')
                    } else {
                        loggerAutoUpdater.error('Error during update check..', info)
                        loggerAutoUpdater.debug('Error Code:', info.code)
                    }
                }
                break
            default:
                loggerAutoUpdater.info('Unknown argument', arg)
                break
        }
    })
}

/**
 * Send a notification to the main process changing the value of
 * allowPrerelease. If we are running a prerelease version, then
 * this will always be set to true, regardless of the current value
 * of val.
 * 
 * @param {boolean} val The new allow prerelease value.
 */
function changeAllowPrerelease(val){
    ipcRenderer.send('autoUpdateAction', 'allowPrereleaseChange', val)
}

function showUpdateUI(info){
    document.getElementById('image_seal_container').setAttribute('update', true)
    document.getElementById('image_seal_container').onclick = () => {
        switchView(getCurrentView(), VIEWS.settings, 500, 500, () => {
            settingsNavItemListener(document.getElementById('settingsNavUpdate'), false)
        })
    }
}

function formatUpdateBytes(bytes){
    if(!Number.isFinite(bytes) || bytes <= 0){
        return '0 MB'
    }
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function renderUpdateDownloadMessage(percent = 0, transferred = 0, total = 0, bytesPerSecond = 0){
    const safePercent = Math.max(0, Math.min(100, Number(percent) || 0))
    const transferredText = formatUpdateBytes(transferred)
    const totalText = formatUpdateBytes(total)
    const speedText = formatUpdateBytes(bytesPerSecond) + '/s'

    return `
        <div class="updateDownloadOverlay">
            <span>${Lang.queryJS('uicore.autoUpdate.downloadingMessage')}</span>
            <div class="updateDownloadProgressFrame">
                <div class="updateDownloadProgressBar" style="width: ${safePercent.toFixed(1)}%;"></div>
            </div>
            <div class="updateDownloadProgressMeta">
                <span>${safePercent.toFixed(0)}%</span>
                <span>${transferredText} / ${totalText}</span>
                <span>${speedText}</span>
            </div>
        </div>
    `
}

function showUpdateDownloadProgress(){
    updatePromptVisible = false
    updateDownloadVisible = true
    setOverlayContent(
        Lang.queryJS('uicore.autoUpdate.downloadingTitle'),
        renderUpdateDownloadMessage(),
        Lang.queryJS('uicore.autoUpdate.downloadingButton')
    )
    setOverlayHandler(() => {})
    document.getElementById('overlayAcknowledge').disabled = true
    toggleOverlay(true, false)
}

function startUpdateDownload(){
    showUpdateDownloadProgress()
    ipcRenderer.send('autoUpdateAction', 'downloadUpdate')
    settingsUpdateButtonStatus(Lang.queryJS('uicore.autoUpdate.downloadingButton'), true)
}

function updateDownloadProgress(progress){
    if(!updateDownloadVisible){
        showUpdateDownloadProgress()
    }
    document.getElementById('overlayDesc').innerHTML = renderUpdateDownloadMessage(
        progress?.percent,
        progress?.transferred,
        progress?.total,
        progress?.bytesPerSecond
    )
}

function showUpdateAvailablePrompt(info){
    showUpdateUI(info)
    if(updatePromptVisible || isOverlayVisible()){
        return
    }
    document.getElementById('overlayAcknowledge').disabled = false
    updatePromptVisible = true
    setOverlayContent(
        Lang.queryJS('uicore.autoUpdate.availableTitle'),
        Lang.queryJS('uicore.autoUpdate.availableMessage', { version: info.version }),
        Lang.queryJS('uicore.autoUpdate.downloadNowButton'),
        Lang.queryJS('uicore.autoUpdate.laterButton')
    )
    setOverlayHandler(() => {
        startUpdateDownload()
    })
    setDismissHandler(() => {
        updatePromptVisible = false
        toggleOverlay(false)
    })
    toggleOverlay(true, true)
}

function showUpdateInstallPrompt(info){
    showUpdateUI(info)
    document.getElementById('overlayAcknowledge').disabled = false
    if(updateInstallPromptVisible || isOverlayVisible()){
        return
    }
    updateInstallPromptVisible = true
    setOverlayContent(
        Lang.queryJS('uicore.autoUpdate.readyTitle'),
        Lang.queryJS('uicore.autoUpdate.readyMessage', { version: info.version }),
        Lang.queryJS('uicore.autoUpdate.installNowButton'),
        Lang.queryJS('uicore.autoUpdate.laterButton')
    )
    setOverlayHandler(() => {
        updateInstallPromptVisible = false
        toggleOverlay(false)
        if(!isDev){
            ipcRenderer.send('autoUpdateAction', 'installUpdateNow')
        }
    })
    setDismissHandler(() => {
        updateInstallPromptVisible = false
        toggleOverlay(false)
    })
    toggleOverlay(true, true)
}

/* jQuery Example
$(function(){
    loggerUICore.info('UICore Initialized');
})*/

document.addEventListener('readystatechange', function () {
    if (document.readyState === 'interactive'){
        loggerUICore.info('UICore Initializing..')

        // Bind close button.
        Array.from(document.getElementsByClassName('fCb')).map((val) => {
            val.addEventListener('click', e => {
                const window = remote.getCurrentWindow()
                window.close()
            })
        })

        // Bind restore down button.
        Array.from(document.getElementsByClassName('fRb')).map((val) => {
            val.addEventListener('click', e => {
                const window = remote.getCurrentWindow()
                if(window.isMaximized()){
                    window.unmaximize()
                } else {
                    window.maximize()
                }
                document.activeElement.blur()
            })
        })

        // Bind minimize button.
        Array.from(document.getElementsByClassName('fMb')).map((val) => {
            val.addEventListener('click', e => {
                const window = remote.getCurrentWindow()
                window.minimize()
                document.activeElement.blur()
            })
        })

        // Remove focus from social media buttons once they're clicked.
        Array.from(document.getElementsByClassName('mediaURL')).map(val => {
            val.addEventListener('click', e => {
                document.activeElement.blur()
            })
        })

    } else if(document.readyState === 'complete'){

        //266.01
        //170.8
        //53.21
        // Bind progress bar length to length of bot wrapper
        //const targetWidth = document.getElementById("launch_content").getBoundingClientRect().width
        //const targetWidth2 = document.getElementById("server_selection").getBoundingClientRect().width
        //const targetWidth3 = document.getElementById("launch_button").getBoundingClientRect().width

        document.getElementById('launch_details').style.maxWidth = 266.01
        document.getElementById('launch_progress').style.width = 170.8
        document.getElementById('launch_details_right').style.maxWidth = 170.8
        document.getElementById('launch_progress_label').style.width = 53.21
        
    }

}, false)

/**
 * Open web links in the user's default browser.
 */
$(document).on('click', 'a[href^="http"]', function(event) {
    event.preventDefault()
    shell.openExternal(this.href)
})

/**
 * Opens DevTools window if you hold (ctrl + shift + i).
 * This will crash the program if you are using multiple
 * DevTools, for example the chrome debugger in VS Code. 
 */
document.addEventListener('keydown', function (e) {
    if((e.key === 'I' || e.key === 'i') && e.ctrlKey && e.shiftKey){
        let window = remote.getCurrentWindow()
        window.toggleDevTools()
    }
})
