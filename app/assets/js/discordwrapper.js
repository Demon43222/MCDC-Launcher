const { LoggerUtil } = require('demciak-core')

const logger = LoggerUtil.getLogger('DiscordWrapper')

const { Client } = require('discord-rpc-patch')

const Lang = require('./langloader')

const DEFAULT_CLIENT_ID = '1496197193739145366'

let client
let activity
let ready = false

function hasValue(value) {
    return value != null && value !== ''
}

function applyOptionalActivityFields(target, fields) {
    Object.entries(fields).forEach(([key, value]) => {
        if(hasValue(value)) {
            target[key] = value
        }
    })
}

exports.initRPC = function(genSettings, servSettings, initialDetails = Lang.queryJS('discord.waiting')){
    exports.shutdownRPC()

    genSettings = genSettings || {}
    servSettings = servSettings || {}

    const clientId = genSettings.clientId || DEFAULT_CLIENT_ID
    if(!hasValue(clientId)) {
        logger.info('Discord Rich Presence disabled, no client id configured.')
        return false
    }

    client = new Client({ transport: 'ipc' })
    ready = false

    activity = {
        details: initialDetails,
        state: Lang.queryJS('discord.state', {shortId: servSettings.shortId || Lang.queryJS('discord.unknownServer')}),
        startTimestamp: new Date().getTime(),
        instance: false
    }

    applyOptionalActivityFields(activity, {
        largeImageKey: servSettings.largeImageKey,
        largeImageText: servSettings.largeImageText,
        smallImageKey: genSettings.smallImageKey,
        smallImageText: genSettings.smallImageText
    })

    client.on('ready', () => {
        ready = true
        logger.info('Discord RPC Connected')
        client.setActivity(activity).catch(error => {
            logger.info('Unable to set Discord Rich Presence activity: ' + error.message, error)
        })
    })
    
    client.login({clientId}).catch(error => {
        if(error.message.includes('ENOENT')) {
            logger.info('Unable to initialize Discord Rich Presence, no client detected.')
        } else {
            logger.info('Unable to initialize Discord Rich Presence: ' + error.message, error)
        }
        client = null
        activity = null
        ready = false
    })

    return true
}

exports.updateDetails = function(details){
    if(activity == null) {
        return
    }
    activity.details = details
    if(client != null && ready) {
        client.setActivity(activity).catch(error => {
            logger.info('Unable to update Discord Rich Presence: ' + error.message, error)
        })
    }
}

exports.shutdownRPC = function(){
    if(!client) {
        activity = null
        ready = false
        return
    }
    client.clearActivity().catch(() => {})
    client.destroy().catch(() => {})
    client = null
    activity = null
    ready = false
}
