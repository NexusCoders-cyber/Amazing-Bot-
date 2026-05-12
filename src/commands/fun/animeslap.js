import { makeAnimeReactionCommand } from '../../utils/animeReaction.js';

export default makeAnimeReactionCommand({
  name: 'animeslap',
  endpoint: 'slap',
  verb: 'slapped',
  selfAction: false
});
