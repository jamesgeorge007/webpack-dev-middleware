'use strict';

const fs = require('fs');
const path = require('path');

const mkdirp = require('mkdirp');
const { colors } = require('webpack-log');

function setupWriteToDisk(context) {
  const compilers = context.compiler.compilers || [context.compiler];

  for (const compiler of compilers) {
    compiler.hooks.emit.tap('WebpackDevMiddleware', (compilation) => {
      if (compiler.hasWebpackDevMiddlewareAssetEmittedCallback) {
        return;
      }

      compiler.hooks.assetEmitted.tapAsync(
        'WebpackDevMiddleware',
        (file, info, callback) => {
          let targetPath = null;
          let content = null;

          // webpack@5
          if (info.compilation) {
            ({ targetPath, content } = info);
          } else {
            let targetFile = file;

            const queryStringIdx = targetFile.indexOf('?');

            if (queryStringIdx >= 0) {
              targetFile = targetFile.substr(0, queryStringIdx);
            }

            let { outputPath } = compiler;

            // TODO Why? Need remove in future major release
            if (outputPath === '/') {
              outputPath = compiler.context;
            }

            outputPath = compilation.getPath(outputPath, {});
            content = info;
            targetPath = path.join(outputPath, targetFile);
          }

          const { writeToDisk: filter } = context.options;
          const allowWrite =
            filter && typeof filter === 'function' ? filter(targetPath) : true;

          if (!allowWrite) {
            return callback();
          }

          const { log } = context;
          const dir = path.dirname(targetPath);

          return mkdirp(dir, (mkdirpError) => {
            if (mkdirpError) {
              return callback(mkdirpError);
            }

            return fs.writeFile(targetPath, content, (writeFileError) => {
              if (writeFileError) {
                return callback(writeFileError);
              }

              log.debug(
                colors.cyan(
                  `Asset written to disk: ${path.relative(
                    process.cwd(),
                    targetPath
                  )}`
                )
              );

              return callback();
            });
          });
        }
      );
      compiler.hasWebpackDevMiddlewareAssetEmittedCallback = true;
    });
  }
}

module.exports = setupWriteToDisk;
