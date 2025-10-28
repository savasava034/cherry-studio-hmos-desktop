const fs = require('fs')
const path = require('path')
const os = require('os')
const https = require('https')

function downloadNpmPackage(packageName, url) {
  const targetDir = path.join('./node_modules/', packageName)

  // Skip if directory already exists
  if (fs.existsSync(targetDir)) {
    console.log(`${targetDir} already exists, skipping download...`)
    return Promise.resolve()
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'npm-download-'))
  const filename = path.join(tempDir, packageName.replace('/', '-') + '.tgz')

  console.log(`Downloading ${packageName}...`, url)
  
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filename)
    const MAX_REDIRECTS = 5
    let redirectCount = 0
    
    function makeRequest(requestUrl) {
      https.get(requestUrl, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          // Handle redirect - follow to new location
          redirectCount++
          if (redirectCount > MAX_REDIRECTS) {
            cleanup()
            reject(new Error(`Too many redirects (${MAX_REDIRECTS})`))
            return
          }
          
          const location = response.headers.location
          if (!location) {
            cleanup()
            reject(new Error('Redirect response missing location header'))
            return
          }
          
          makeRequest(location)
          return
        }
        
        handleResponse(response)
      }).on('error', (err) => {
        cleanup()
        reject(err)
      })
    }
    
    makeRequest(url)
    
    function handleResponse(response) {
      if (response.statusCode !== 200) {
        cleanup()
        reject(new Error(`Failed to download: ${response.statusCode} ${response.statusMessage}`))
        return
      }
      
      response.pipe(file)
      
      file.on('finish', async () => {
        file.close()
        
        try {
          console.log(`Extracting ${packageName}...`)
          
          // Extract using tar-stream or manually
          // For simplicity, we'll use child_process with Node's tar module if available
          // Otherwise fall back to a manual extraction
          await extractTarGz(filename, tempDir)
          
          // Move the package directory to node_modules
          const packageDir = path.join(tempDir, 'package')
          
          if (!fs.existsSync(packageDir)) {
            throw new Error(`Package directory not found after extraction: ${packageDir}`)
          }
          
          // Create target directory
          fs.mkdirSync(targetDir, { recursive: true })
          
          // Copy all files from package to target
          copyDirRecursive(packageDir, targetDir)
          
          // Clean up temp directory
          fs.rmSync(tempDir, { recursive: true, force: true })
          
          console.log(`Successfully installed ${packageName}`)
          resolve()
        } catch (err) {
          cleanup()
          reject(err)
        }
      })
      
      file.on('error', (err) => {
        cleanup()
        reject(err)
      })
    }
    
    function cleanup() {
      try {
        if (fs.existsSync(filename)) {
          fs.unlinkSync(filename)
        }
        if (fs.existsSync(tempDir)) {
          fs.rmSync(tempDir, { recursive: true, force: true })
        }
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  })
}

async function extractTarGz(filename, outputDir) {
  // Try to use tar module if available
  try {
    const tar = require('tar')
    await tar.x({
      file: filename,
      cwd: outputDir,
    })
    return
  } catch (e) {
    // tar module not available, try command line
  }
  
  // Fallback to command line tar
  const { execSync } = require('child_process')
  
  try {
    // Windows 10+ and modern Unix systems have tar command built-in
    execSync(`tar -xzf "${filename}" -C "${outputDir}"`, { stdio: 'pipe' })
  } catch (cmdError) {
    throw new Error(`Failed to extract tarball: ${cmdError.message}`)
  }
}

function copyDirRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true })
  const entries = fs.readdirSync(src, { withFileTypes: true })
  
  for (let entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

module.exports = {
  downloadNpmPackage
}
