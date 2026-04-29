'use strict'

const heliosCommon = require('helios-core/common')

function normalizeModule(rawModule){
    if(rawModule == null || typeof rawModule !== 'object'){
        return rawModule
    }

    if(Array.isArray(rawModule.subModules)){
        rawModule.subModules = rawModule.subModules.map(normalizeModule)
    }

    return rawModule
}

function normalizeDistribution(rawDistribution){
    if(rawDistribution == null || typeof rawDistribution !== 'object'){
        return rawDistribution
    }

    if(Array.isArray(rawDistribution.servers)){
        rawDistribution.servers = rawDistribution.servers.map((server) => {
            if(server != null && Array.isArray(server.modules)){
                server.modules = server.modules.map(normalizeModule)
            }
            return server
        })
    }

    return rawDistribution
}

class DistributionAPI extends heliosCommon.DistributionAPI {
    async pullRemote(){
        const response = await super.pullRemote()
        if(response != null && response.data != null){
            response.data = normalizeDistribution(response.data)
        }
        return response
    }

    async readDistributionFromFile(path){
        const distribution = await super.readDistributionFromFile(path)
        return normalizeDistribution(distribution)
    }

    async writeDistributionToDisk(distribution){
        return await super.writeDistributionToDisk(normalizeDistribution(distribution))
    }
}

module.exports = {
    ...heliosCommon,
    DistributionAPI,
    normalizeDistribution
}
