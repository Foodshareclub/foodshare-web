/**
 * Pretty Logger Tests
 */

import { pretty } from '../pretty';
import { COLORS, EMOJI, getTimingStyle, getStatusStyle } from '../styles';

describe('Pretty Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('log levels', () => {
    it('should log info messages', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      pretty.info('Test info message');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should log success messages', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      pretty.success('Test success message');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should log warning messages', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      pretty.warn('Test warning message');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should log error messages', () => {
      const consoleSpy = jest.spyOn(console, 'group').mockImplementation();
      const consoleEndSpy = jest.spyOn(console, 'groupEnd').mockImplementation();
      pretty.error('Test error message', new Error('Test'));
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
      consoleEndSpy.mockRestore();
    });
  });

  describe('specialized logs', () => {
    it('should log API requests', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      pretty.api('GET', '/api/products', 200, 45, 1024);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should log database queries', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      pretty.db('SELECT', 'posts', 12, 50);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should log performance measurements', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      pretty.perf('render', 45);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('context handling', () => {
    it('should include component context', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      pretty.info('Test message', { component: 'TestComponent' });
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle data parameter', () => {
      const consoleSpy = jest.spyOn(console, 'groupCollapsed').mockImplementation();
      const consoleEndSpy = jest.spyOn(console, 'groupEnd').mockImplementation();
      pretty.info('Test message', { component: 'Test' }, { foo: 'bar' });
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
      consoleEndSpy.mockRestore();
    });
  });
});

describe('Logger Styles', () => {
  describe('getTimingStyle', () => {
    it('should return fast style for < 100ms', () => {
      const result = getTimingStyle(50);
      expect(result.emoji).toBe(EMOJI.fast);
      expect(result.color).toBe(COLORS.success);
    });

    it('should return slow style for 100-500ms', () => {
      const result = getTimingStyle(250);
      expect(result.emoji).toBe(EMOJI.slow);
      expect(result.color).toBe(COLORS.warn);
    });

    it('should return critical style for > 500ms', () => {
      const result = getTimingStyle(600);
      expect(result.emoji).toBe(EMOJI.critical);
      expect(result.color).toBe(COLORS.error);
    });
  });

  describe('getStatusStyle', () => {
    it('should return success style for 2xx', () => {
      const result = getStatusStyle(200);
      expect(result.emoji).toBe(EMOJI.success);
      expect(result.color).toBe(COLORS.success);
    });

    it('should return warning style for 4xx', () => {
      const result = getStatusStyle(404);
      expect(result.emoji).toBe(EMOJI.warn);
      expect(result.color).toBe(COLORS.warn);
    });

    it('should return error style for 5xx', () => {
      const result = getStatusStyle(500);
      expect(result.emoji).toBe(EMOJI.error);
      expect(result.color).toBe(COLORS.error);
    });
  });
});
