import { makeAnimeReactionCommand } from '../../utils/animeReaction.js';

export default makeAnimeReactionCommand({
  name: 'animebonk',
  endpoint: 'bonk',
  verb: 'bonked',
  selfAction: false
});
