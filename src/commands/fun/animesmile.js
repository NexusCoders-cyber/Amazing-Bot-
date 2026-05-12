import { makeAnimeReactionCommand } from '../../utils/animeReaction.js';

export default makeAnimeReactionCommand({
  name: 'animesmile',
  endpoint: 'smile',
  verb: 'smiled',
  selfAction: true
});
