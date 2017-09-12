module.exports = {
  files: {
    javascripts: {joinTo: 'bundle.js'},
    stylesheets: {joinTo: 'bundle.css'},
  },
  plugins: {
    browserSync: {
      port: 3334,
      logLevel: "debug"
    }
  },
  server: {
    run: true,
    port: 3333
  }
}
