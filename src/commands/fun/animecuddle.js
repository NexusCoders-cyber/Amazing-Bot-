import { makeAnimeReactionCommand } from '../../utils/animeReaction.js';

export default makeAnimeReactionCommand({
  name: 'animecuddle',
  endpoint: 'cuddle',
  verb: 'cuddled',
  selfAction: false
});
