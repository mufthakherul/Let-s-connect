module.exports = {
  name: 'example',
  description: 'Example plugin that echoes back a message',
  command: 'example',
  handler: async (args, ctx) => {
    console.log('Example plugin: ', args.join(' ') || 'Hello from example plugin!');
  }
};
