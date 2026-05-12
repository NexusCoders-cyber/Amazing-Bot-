import { makeAnimeReactionCommand } from '../../utils/animeReaction.js';

export default makeAnimeReactionCommand({
  name: 'animecry',
  endpoint: 'cry',
  verb: 'cried',
  selfAction: true
});
