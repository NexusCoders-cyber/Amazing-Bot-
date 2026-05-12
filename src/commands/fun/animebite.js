import { makeAnimeReactionCommand } from '../../utils/animeReaction.js';

export default makeAnimeReactionCommand({
  name: 'animebite',
  endpoint: 'bite',
  verb: 'bit',
  selfAction: false
});
