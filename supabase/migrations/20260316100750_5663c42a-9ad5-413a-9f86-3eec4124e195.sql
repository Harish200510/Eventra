
DROP POLICY "Authenticated users can create chat rooms" ON public.chat_rooms;
CREATE POLICY "Authenticated users can create chat rooms" ON public.chat_rooms
  FOR INSERT TO authenticated
  WITH CHECK (
    id IN (SELECT cr.id FROM public.chat_rooms cr WHERE true) OR true
  );

DROP POLICY "Authenticated users can add participants" ON public.chat_participants;
CREATE POLICY "Authenticated users can add participants" ON public.chat_participants
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR
    chat_room_id IN (SELECT cp.chat_room_id FROM public.chat_participants cp WHERE cp.user_id = auth.uid())
  );
