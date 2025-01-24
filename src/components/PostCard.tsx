"use client";
import {
  createComment,
  deletePost,
  toggleLike,
  type getPosts,
} from "@/actions/post.action";
import { SignInButton, useUser } from "@clerk/nextjs";
import React, { useState } from "react";
import toast from "react-hot-toast";
import { Card, CardContent } from "./ui/card";
import Link from "next/link";
import {
  HeartIcon,
  LogInIcon,
  MessageCircleIcon,
  SendIcon,
} from "lucide-react";
import { AvatarImage, Avatar } from "./ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { DeleteAlertDialog } from "./DeleteAlertDialog";
import Image from "next/image";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";

type Posts = Awaited<ReturnType<typeof getPosts>>;
type Post = Posts[number];
const PostCard = ({
  post,
  dbUserId,
}: {
  post: Post;
  dbUserId: string | null;
}) => {
  const { user } = useUser();
  const [newComment, setNewComment] = useState("");
  const [isCommenting, setIsCommenting] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasLiked, setHasLiked] = useState(
    post.likes.some((like) => like.userId === dbUserId)
  );
  const [optimisticLikes, setOptimisticLikes] = useState(post._count.likes);
  const [showComments, setShowComments] = useState(false);
  const handleLike = async () => {
    if (isLiking) return;
    try {
      setIsLiking(true);
      setHasLiked((prev) => !prev); // setHasLiked(!hasLiked)
      setOptimisticLikes((prev) => prev + (hasLiked ? -1 : 1));
      await toggleLike(post.id);
    } catch (error) {
      setOptimisticLikes(post._count.likes); // set is to initial
      setHasLiked(post.likes.some((like) => like.userId === dbUserId));
    } finally {
      setIsLiking(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || isCommenting) return;

    try {
      setIsCommenting(true);
      const result = await createComment(post.id, newComment);
      if (result?.success) {
        toast.success("Comment posted successfully");
        setNewComment("");
      }
    } catch (error) {
      toast.error("Failed to add comment");
    } finally {
      setIsCommenting(false);
    }
  };

  const handleDeletePost = async () => {
    if (isDeleting) return;
    try {
      setIsDeleting(true);
      const result = await deletePost(post.id);
      if (result.success) toast.success("Post deleted successfully");
      else throw new Error(result.error);
    } catch (error) {
      toast.error("Failed to delete post");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 sm:p-6">
        <div className="space-y-4">
          <div className="flex flex-col">
            <div className="flex flex-row">
              <Link href={`/profile/${post.author.username}`}>
                <Avatar>
                  <AvatarImage src={post.author.image ?? "/avatar.png"} />
                </Avatar>
              </Link>

              <div className="w-full flex flex-row items-start justify-between">
                <div className="flex flex-col mx-3 items-start">
                  {post?.author.username ? (
                    <Link
                      href={`/profile/${post.author.username}`}
                      className="font-semibold truncate"
                    >
                      {post.author.name}
                    </Link>
                  ) : (
                    <Link href={`/profile/${post.author.username}`}>
                      @{post.author.username}
                    </Link>
                  )}

                  <div className="text-xs">
                    {formatDistanceToNow(new Date(post.createdAt))}
                  </div>
                </div>
                {/* Check if current user is the post author */}
                {dbUserId === post.author.id && (
                  <DeleteAlertDialog
                    isDeleting={isDeleting}
                    onDelete={handleDeletePost}
                  />
                )}
              </div>
            </div>

            {/* POST HEADER & TEXT CONTENT */}
            <div className="flex-1 my-2">
              <p className="mt-2 text-sm text-foreground break-words">
                {post.content}
              </p>
            </div>

            {/* POST IMAGE */}
            {post.image && (
              <div className="rounded-lg overflow-hidden">
                <img
                  src={post.image}
                  alt="Post content"
                  className="w-auto h-auto object-cover m-auto"
                />
              </div>
            )}

            {/* LIKE & COMMENT BUTTONS */}
            <div className="flex items-center pt-2 space-x-4">
              {user ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className={`text-muted-foreground gap-2 ${
                    hasLiked
                      ? "text-red-500 hover:text-red-600"
                      : "hover:text-red-500"
                  }`}
                  onClick={handleLike}
                >
                  {hasLiked ? (
                    <HeartIcon className="size-5 fill-current" />
                  ) : (
                    <HeartIcon className="size-5" />
                  )}
                  <span>{optimisticLikes}</span>
                </Button>
              ) : (
                <SignInButton mode="modal">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground gap-2"
                  >
                    <HeartIcon className="size-5" />
                    <span>{optimisticLikes}</span>
                  </Button>
                </SignInButton>
              )}

              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground gap-2 hover:text-blue-500"
                onClick={() => setShowComments((prev) => !prev)}
              >
                <MessageCircleIcon
                  className={`size-5 ${
                    showComments ? "fill-blue-500 text-blue-500" : ""
                  }`}
                />
                <span>{post.comments.length}</span>
              </Button>
            </div>
          </div>

          {/* COMMENTS SECTION */}
          {showComments && (
            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-4">
                {/* DISPLAY COMMENTS */}
                {post.comments.map((comment) => (
                  <div key={comment.id} className="flex flex-row space-x-3">
                    <Avatar className="size-6 flex-shrink-0">
                      <AvatarImage
                        src={comment.author.image ?? "/avatar.png"}
                      />
                    </Avatar>
                    <div className="flex flex-col">
                      <div className="flex-1 border rounded-xl p-2">
                        {comment?.author.username && (
                          <Link href={`/profile/${comment.author.username}`}>
                            <div className="font-semibold text-sm">
                              {comment?.author.name}
                            </div>
                          </Link>
                        )}

                        {/* comment content */}
                        <p className="text-sm break-words">{comment.content}</p>
                      </div>

                      {/* date */}
                      <div className="text-xs mx-3 my-2 text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.createdAt))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {user ? (
                <div className="flex space-x-3">
                  <Avatar className="size-6 flex-shrink-0">
                    <AvatarImage src={user?.imageUrl || "/avatar.png"} />
                  </Avatar>
                  <div className="flex-1">
                    <Textarea
                      placeholder="Write a comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="min-h-[80px] resize-none"
                    />
                    <div className="flex justify-end mt-2">
                      <Button
                        size="sm"
                        onClick={handleAddComment}
                        className="flex items-center gap-2"
                        disabled={!newComment.trim() || isCommenting}
                      >
                        {isCommenting ? (
                          "Posting..."
                        ) : (
                          <>
                            <SendIcon className="size-4" />
                            Comment
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex justify-center p-4 border rounded-lg bg-muted/50">
                  <SignInButton mode="modal">
                    <Button variant="outline" className="gap-2">
                      <LogInIcon className="size-4" />
                      Sign in to comment
                    </Button>
                  </SignInButton>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PostCard;
