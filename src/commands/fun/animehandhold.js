import { makeAnimeReactionCommand } from '../../utils/animeReaction.js';

export default makeAnimeReactionCommand({
  name: 'animehandhold',
  endpoint: 'handhold',
  verb: 'held hands with',
  selfAction: false
});
