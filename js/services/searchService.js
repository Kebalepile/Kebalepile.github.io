import { searchPostsRemote } from "./postService.js";
import { searchUsersRemote } from "./userService.js";

export async function searchUsers(query, options = {}) {
  return searchUsersRemote(query, options);
}

export async function searchPosts(query, options = {}) {
  return searchPostsRemote(query, options);
}
