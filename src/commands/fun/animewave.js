import { makeAnimeReactionCommand } from '../../utils/animeReaction.js';

export default makeAnimeReactionCommand({
  name: 'animewave',
  endpoint: 'wave',
  verb: 'waved',
  selfAction: true
});
