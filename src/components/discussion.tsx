import { useTranslation } from "next-i18next";
import { usePlausible } from "next-plausible";
import * as React from "react";

import { Button } from "@/components/button";
import CompactButton from "@/components/compact-button";
import Dropdown, { DropdownItem } from "@/components/dropdown";
import Chat from "@/components/icons/chat.svg";
import DotsHorizontal from "@/components/icons/dots-horizontal.svg";
import Plus from "@/components/icons/plus.svg";
import Trash from "@/components/icons/trash.svg";
import TruncatedLinkify from "@/components/poll/truncated-linkify";
import UserAvatar from "@/components/poll/user-avatar";
import { usePoll } from "@/components/poll-provider";
import { useUser } from "@/components/user-provider";
import { useDayjs } from "@/utils/dayjs";
import { trpc } from "@/utils/trpc";

import { useComposer } from "./discussion/composer";
import { withModal } from "./modal/modal-provider";
import { useParticipants } from "./participants-provider";
import { Section } from "./section";

const Discussion: React.VoidFunctionComponent = () => {
  const { dayjs } = useDayjs();
  const queryClient = trpc.useContext();
  const { t } = useTranslation("app");
  const { poll } = usePoll();

  const pollId = poll.id;

  const { data: comments } = trpc.useQuery(
    ["polls.comments.list", { pollId }],
    {
      refetchInterval: 10000, // refetch every 10 seconds
    },
  );

  const composer = useComposer();

  const { getParticipantsForUser } = useParticipants();
  const { user } = useUser();
  const plausible = usePlausible();

  const deleteComment = trpc.useMutation("polls.comments.delete", {
    onMutate: ({ commentId }) => {
      queryClient.setQueryData(
        ["polls.comments.list", { pollId }],
        (existingComments = []) => {
          return [...existingComments].filter(({ id }) => id !== commentId);
        },
      );
    },
    onSuccess: () => {
      plausible("Deleted comment");
    },
  });

  if (!comments) {
    return null;
  }

  return (
    <Section
      icon={Chat}
      title={
        comments.length > 0
          ? t("commentCount", { count: comments.length })
          : t("comments")
      }
      actions={
        <Button
          icon={<Plus />}
          onClick={() => {
            composer.show({
              showClose: true,
              size: "md",
            });
          }}
        >
          {t("leaveAComment")}
        </Button>
      }
    >
      {comments.length ? (
        <div className="mb-4 space-y-4">
          {comments.map((comment) => {
            const canDelete =
              poll.admin || !comment.userId || comment.userId === user.id;

            const participants = comment.userId
              ? getParticipantsForUser(comment.userId)
              : [];

            return (
              <div className="flex" key={comment.id}>
                <div data-testid="comment" className="space-y-2">
                  <div className="flex items-center gap-2">
                    <UserAvatar
                      name={
                        comment.user?.name ??
                        `${t("guest")} ${comment.userId?.substring(6, 11)}`
                      }
                      showName={true}
                      isYou={user.id === comment.userId}
                      color="bg-slate-400"
                    />
                    <div className="mb-1">
                      <span className="mr-1 text-gray-400">&bull;</span>
                      <span className="mr-1 rounded px-2 py-1 text-sm text-slate-500">
                        {participants.length > 1 ? (
                          participants.map(({ name }) => (
                            <UserAvatar
                              className="-ml-1 ring-2 ring-white"
                              key={name}
                              name={name}
                            />
                          ))
                        ) : participants.length > 0 ? (
                          <UserAvatar
                            name={participants[0].name}
                            showName={true}
                          />
                        ) : (
                          "Not voted yet"
                        )}
                      </span>
                      <span className="mr-1 text-slate-400">&bull;</span>
                      <span className="text-sm text-slate-500">
                        {dayjs(new Date(comment.createdAt)).fromNow()}
                      </span>
                    </div>
                    <Dropdown
                      placement="bottom-start"
                      trigger={<CompactButton icon={DotsHorizontal} />}
                    >
                      <DropdownItem
                        icon={Trash}
                        label={t("delete")}
                        disabled={!canDelete}
                        onClick={() => {
                          deleteComment.mutate({
                            commentId: comment.id,
                            pollId,
                          });
                        }}
                      />
                    </Dropdown>
                  </div>
                  <div className=" ml-5 w-fit whitespace-pre-wrap rounded-xl bg-gray-100 px-3 py-2">
                    <TruncatedLinkify>{comment.content}</TruncatedLinkify>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-md p-4 text-center text-slate-400">
          {t("noComments")}
        </div>
      )}
    </Section>
  );
};

export default withModal(Discussion);
