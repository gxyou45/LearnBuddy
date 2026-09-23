import type {Lesson} from './contentRepository';
// Supplement existing stories without changing their versioned lesson IDs or steps.
const legacy:Record<string,[string,string]>={family:['谁一起看书？','爸爸、妈妈和我。'],home:['一家人站在哪里？','家门口。'],welcome:['客人来了，我怎样打招呼？','招手，说你好。'],pets:['小猫和小狗在哪里玩球？','草地上。'],snack:['谁在喝水？谁在吃饭？','小猫喝水，小狗吃饭。'],pond:['小鱼和小鸟分别在哪里？','小鱼在水里，小鸟在树上。'],basket:['篮子里有谁？它在做什么？','小猫在睡觉。'],sky:['白天和夜晚，山上分别有什么？','白天有太阳，夜晚有月亮。'],plants:['小花下面有什么？','绿草。'],positions:['谁在树上，谁在树下？','小鸟在树上，小猫在树下。']};
export function Comprehension({lesson}:{lesson:Lesson}){
 const pair=lesson.story.question?[lesson.story.question,lesson.story.answer]:legacy[lesson.id];
 return <>{pair&&!lesson.story.question&&<details className="comprehension"><summary>读懂了吗？和家长聊一聊</summary><p>{pair[0]}</p><p>家长参考：{pair[1]}</p></details>}{pair&&lesson.story.question&&<div className="soft-card"><h3>读懂了吗？</h3><p>{pair[0]}</p><details><summary>家长参考</summary><p>{pair[1]}</p></details></div>}{!!lesson.reviewTasks?.length&&<div className="soft-card"><h3>主题复习 · 可以分次做</h3>{lesson.reviewTasks.map(t=><p key={t}>{t}</p>)}</div>}</>;
}
