const ImageGateway = require('./ImageGateway');
const VideoGateway = require('./VideoGateway');
const MockImageProvider = require('./providers/MockImageProvider');
const MockVideoProvider = require('./providers/MockVideoProvider');
const OpenAIImageProvider = require('./providers/OpenAIImageProvider');
const RunwayVideoProvider = require('./providers/RunwayVideoProvider');

// Swapping a provider (e.g. OpenAI -> Flux, Runway -> Kling) means adding a
// new class next to these and adding one entry below — nothing else in the
// codebase (services, controllers, routes) needs to change.
function buildImageGateway() {
  const providerName = process.env.IMAGE_PROVIDER || 'mock';
  const providers = {
    openai: () => new OpenAIImageProvider(),
    mock: () => new MockImageProvider(),
  };

  const factory = providers[providerName] || providers.mock;
  return new ImageGateway(factory());
}

function buildVideoGateway() {
  const providerName = process.env.VIDEO_PROVIDER || 'mock';
  const providers = {
    runway: () => new RunwayVideoProvider(),
    mock: () => new MockVideoProvider(),
  };

  const factory = providers[providerName] || providers.mock;
  return new VideoGateway(factory());
}

module.exports = {
  imageGateway: buildImageGateway(),
  videoGateway: buildVideoGateway(),
};
