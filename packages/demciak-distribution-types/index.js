'use strict'

const distributionTypes = require('helios-distribution-types')

if(distributionTypes.Type.NeoForge == null){
    distributionTypes.Type.NeoForge = 'NeoForge'
}

if(distributionTypes.Type.NeoForgeMod == null){
    distributionTypes.Type.NeoForgeMod = 'NeoForgeMod'
}

if(distributionTypes.TypeMetadata.NeoForge == null){
    distributionTypes.TypeMetadata.NeoForge = {
        id: distributionTypes.Type.NeoForge,
        defaultExtension: 'jar'
    }
}

if(distributionTypes.TypeMetadata.NeoForgeMod == null){
    distributionTypes.TypeMetadata.NeoForgeMod = {
        id: distributionTypes.Type.NeoForgeMod,
        defaultExtension: 'jar'
    }
}

module.exports = distributionTypes
