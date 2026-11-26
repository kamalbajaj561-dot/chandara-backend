import { emitToChatRoom, removeUserFromChatRoom } from '../emit';
import * as sockets from '../index';

jest.mock('../index');

describe('server-side chat emits', () => {
  it('emits to the chat room of the event', () => {
    const emit = jest.fn();
    (sockets.getIO as jest.Mock).mockReturnValue({ to: jest.fn(() => ({ emit })) });
    emitToChatRoom('e1', 'new-message', { id: 'm1' });
    expect((sockets.getIO() as any).to).toHaveBeenCalledWith('chat:e1');
    expect(emit).toHaveBeenCalledWith('new-message', { id: 'm1' });
  });
  it('does nothing without an event id or when sockets are not initialised', () => {
    (sockets.getIO as jest.Mock).mockImplementation(() => { throw new Error('Socket.io not initialized'); });
    expect(() => emitToChatRoom('e1', 'x', {})).not.toThrow();
    expect(() => emitToChatRoom(undefined, 'x', {})).not.toThrow();
  });
  it('removes only the banned user from the room', async () => {
    const mk = (uid: string) => ({ data: { user: { userId: uid } }, leave: jest.fn() });
    const a = mk('banned'); const b = mk('other');
    (sockets.getIO as jest.Mock).mockReturnValue({ in: () => ({ fetchSockets: async () => [a, b] }) });
    await removeUserFromChatRoom('e1', 'banned');
    expect(a.leave).toHaveBeenCalledWith('chat:e1');
    expect(b.leave).not.toHaveBeenCalled();
  });
});
