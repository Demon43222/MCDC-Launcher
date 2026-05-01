const fs = require('fs')
const path = require('path')

const filePath = path.resolve(process.argv[2] || 'server.json')
const fallbackPath = path.resolve('server.template.json')
const target = fs.existsSync(filePath) ? filePath : fallbackPath
const strictArtifacts = path.basename(target).toLowerCase() === 'server.json'

const errors = []
const warnings = []

function fail(message) {
    errors.push(message)
}

function warn(message) {
    warnings.push(message)
}

function isObject(value) {
    return value != null && typeof value === 'object' && !Array.isArray(value)
}

function isUrl(value) {
    try {
        const parsed = new URL(value)
        return parsed.protocol === 'https:' || parsed.protocol === 'http:'
    } catch(_err) {
        return false
    }
}

function validateRequired(value, label) {
    if(value == null || value === '') {
        fail(`${label} is required.`)
        return false
    }
    return true
}

function validateArtifact(module, label) {
    if(module.artifact == null) {
        warn(`${label} has no artifact.`)
        return
    }

    const artifact = module.artifact
    if(artifact.url != null && !isUrl(artifact.url)) {
        fail(`${label}.artifact.url is not a valid URL.`)
    }
    if(artifact.MD5 == null || /^REPLACE|^TODO|^TBD/i.test(`${artifact.MD5}`)) {
        const message = `${label}.artifact.MD5 is missing or still a placeholder.`
        strictArtifacts ? fail(message) : warn(message)
    }
    if(typeof artifact.size !== 'number' || artifact.size <= 0) {
        const message = `${label}.artifact.size must be a positive number.`
        strictArtifacts ? fail(message) : warn(message)
    }
}

function validateModule(module, label) {
    if(!isObject(module)) {
        fail(`${label} must be an object.`)
        return
    }

    validateRequired(module.id, `${label}.id`)
    validateRequired(module.type, `${label}.type`)

    const supportedTypes = new Set([
        'ForgeHosted',
        'ForgeMod',
        'NeoForge',
        'NeoForgeMod',
        'Fabric',
        'FabricMod',
        'LiteLoader',
        'LiteMod',
        'Library',
        'File',
        'VersionManifest'
    ])

    if(module.type != null && !supportedTypes.has(module.type)) {
        warn(`${label}.type "${module.type}" is not in the known launcher type list.`)
    }

    validateArtifact(module, label)

    if(module.subModules != null) {
        if(!Array.isArray(module.subModules)) {
            fail(`${label}.subModules must be an array.`)
        } else {
            module.subModules.forEach((subModule, index) => validateModule(subModule, `${label}.subModules[${index}]`))
        }
    }
}

let distro
try {
    distro = JSON.parse(fs.readFileSync(target, 'utf8'))
} catch(err) {
    console.error(`Unable to parse ${target}: ${err.message}`)
    process.exit(1)
}

if(!isObject(distro)) {
    fail('Distribution root must be an object.')
} else {
    validateRequired(distro.version, 'version')

    if(!Array.isArray(distro.servers) || distro.servers.length === 0) {
        fail('servers must be a non-empty array.')
    } else {
        distro.servers.forEach((server, index) => {
            const label = `servers[${index}]`
            if(!isObject(server)) {
                fail(`${label} must be an object.`)
                return
            }

            validateRequired(server.id, `${label}.id`)
            validateRequired(server.name, `${label}.name`)
            validateRequired(server.minecraftVersion, `${label}.minecraftVersion`)
            validateRequired(server.version, `${label}.version`)

            if(server.address != null && typeof server.address !== 'string') {
                fail(`${label}.address must be a string.`)
            }

            if(!Array.isArray(server.modules) || server.modules.length === 0) {
                fail(`${label}.modules must be a non-empty array.`)
            } else {
                server.modules.forEach((module, moduleIndex) => validateModule(module, `${label}.modules[${moduleIndex}]`))
            }

            const ram = server.javaOptions?.ram
            if(ram != null) {
                for(const key of ['minimum', 'recommended', 'recommendedMin', 'recommendedMax']) {
                    if(ram[key] != null && (typeof ram[key] !== 'number' || ram[key] <= 0)) {
                        fail(`${label}.javaOptions.ram.${key} must be a positive number when provided.`)
                    }
                }
            }
        })
    }
}

console.log(`Validated: ${path.relative(process.cwd(), target) || target}`)

if(warnings.length > 0) {
    console.log('\nWarnings:')
    warnings.forEach(message => console.log(`- ${message}`))
}

if(errors.length > 0) {
    console.error('\nErrors:')
    errors.forEach(message => console.error(`- ${message}`))
    process.exit(1)
}

console.log('Distribution file looks OK.')
