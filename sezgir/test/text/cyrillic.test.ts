// Uzbek Latin → Cyrillic: what Sezgir types when the user asks for Cyrillic.

import { describe, expect, it } from 'vitest';

import { inUzbekScript, otherScript, uzbekLatinToCyrillic } from '../../src/core/text/index.js';

const OKINA = 'ʻ';
const TUTUQ = 'ʼ';

describe('uzbekLatinToCyrillic', () => {
  it.each([
    [`O${OKINA}zbekiston`, 'Ўзбекистон'],
    ['shahar', 'шаҳар'],
    ['choy', 'чой'],
    [`g${OKINA}isht`, 'ғишт'],
    [`yo${OKINA}l`, 'йўл'],
    [`yo${OKINA}q`, 'йўқ'],
    ['yoz', 'ёз'],
    ['yoshlik', 'ёшлик'],
    ['yangi', 'янги'],
    ['yuz', 'юз'],
    ['yer', 'ер'],
    ['Yevropa', 'Европа'],
    ['ertaga', 'эртага'],
    ['aeroport', 'аэропорт'],
    ['poeziya', 'поэзия'],
    ['tez', 'тез'],
    ['telefon', 'телефон'],
    [`ta${TUTUQ}lim`, 'таълим'],
    [`san${TUTUQ}at`, 'санъат'],
    [`ma${TUTUQ}ruza`, 'маъруза'],
    [`e${TUTUQ}lon`, 'эълон'],
    [`Is${TUTUQ}hoq`, 'Исҳоқ'],
    ['qanday', 'қандай'],
    ['xat', 'хат'],
    ['hayot', 'ҳаёт'],
    ['mehnat', 'меҳнат'],
    ['Toshkent', 'Тошкент'],
    ['ming', 'минг'],
    ['oila', 'оила'],
    ['Assalomu alaykum', 'Ассалому алайкум'],
    ['SHAHAR', 'ШАҲАР'],
    ['YANGI YER', 'ЯНГИ ЕР'],
    [`O${OKINA}ZBEK`, 'ЎЗБЕК'],
  ])('%s → %s', (latin, cyrillic) => {
    expect(uzbekLatinToCyrillic(latin)).toBe(cyrillic);
  });

  it('reads the okina and tutuq look-alikes a keyboard produces the same way', () => {
    expect(uzbekLatinToCyrillic("o'zbek g'alaba ta'lim")).toBe('ўзбек ғалаба таълим');
    expect(uzbekLatinToCyrillic('o‘zbek ta’lim')).toBe('ўзбек таълим');
  });

  it('keeps punctuation, digits, sentence shape and quotes', () => {
    expect(uzbekLatinToCyrillic(`Salom, dunyo! Bugun 5-oktabr, soat 10:30 da uchrashamiz.`)).toBe(
      'Салом, дунё! Бугун 5-октабр, соат 10:30 да учрашамиз.',
    );
    expect(uzbekLatinToCyrillic("'Kitob' deb aytdi.")).toBe("'Китоб' деб айтди.");
    expect(uzbekLatinToCyrillic('- birinchi\n- ikkinchi')).toBe('- биринчи\n- иккинчи');
  });

  it('leaves web and e-mail addresses alone', () => {
    expect(uzbekLatinToCyrillic('Sayt: https://kun.uz/news va pochta ali@mail.uz')).toBe(
      'Сайт: https://kun.uz/news ва почта ali@mail.uz',
    );
  });

  it('passes text that is already Cyrillic through unchanged', () => {
    expect(uzbekLatinToCyrillic('Ўзбекистон')).toBe('Ўзбекистон');
  });
});

describe('inUzbekScript', () => {
  it('respells Uzbek only, and only for Cyrillic', () => {
    expect(inUzbekScript('salom', 'uz', 'cyrillic')).toBe('салом');
    expect(inUzbekScript('salom', 'uz', 'latin')).toBe('salom');
    expect(inUzbekScript('hello', 'en', 'cyrillic')).toBe('hello');
    expect(inUzbekScript('привет', 'ru', 'cyrillic')).toBe('привет');
  });

  it('flips', () => {
    expect(otherScript('latin')).toBe('cyrillic');
    expect(otherScript('cyrillic')).toBe('latin');
  });
});
