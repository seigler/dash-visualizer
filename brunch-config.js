module.exports = {
  files: {
    javascripts: {joinTo: 'bundle.js'},
    stylesheets: {joinTo: 'bundle.css'},
  },
  plugins: {
    babel: {
      presets: ['@babel/preset-env'],
      ignore: [
        /^node_modules/
      ]
    },
  },
  server: {
    run: true,
    port: 3333
  }
}
