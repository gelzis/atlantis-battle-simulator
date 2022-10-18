import SkillList from '../../engine/skills.json';
import ItemListUntyped from '../../engine/items.json';
import ObjectList from '../../engine/objects.json';
import {ItemResource, SkillResource} from './types';

const ItemList: ItemResource[] = ItemListUntyped as [];

export const SkillListSorted = SkillList.sort((a, b) => {
    if (a.name > b.name) {
        return 1;
    } else {
        return -1;
    }
});

export const ItemListSorted = ItemList.sort((a, b) => {
    if (a.name.toLowerCase() > b.name.toLowerCase()) {
        return 1;
    } else {
        return -1;
    }
});

export const SoldierItems = ItemList
    .filter(x => x.category === 'man' || x.category === 'monster' || x.category === 'illusion')
    .map(x => x.abbr);

export const ObjectListSorted = ObjectList.sort();

export function getSkillByAbbr(abbr: string): SkillResource | undefined {
    return SkillList.find((item) => item.abbr === abbr);
}

export function getItemByAbbr(abbr: string): ItemResource | undefined {
    return ItemList.find((item) => item.abbr === abbr);
}
