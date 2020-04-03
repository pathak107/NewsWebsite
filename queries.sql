create table Admin(
    admin_id integer primary key, 
    username varchar(100), 
    pass varchar(100)   
);

create table Category(
cat_id integer primary key ,
category varchar(100)
);

create table News(
b_id integer primary key,
title text,
postBody text,
photo varchar(150),
dateandTime text,
author varchar(100),
priority integer,
admin_id integer,
cat_id integer,
foreign key(cat_id) references Category(cat_id),
foreign key(admin_id) references Admin(admin_id)
);

drop table Category;
drop table Admin;
drop table News;

select* from Admin;
select * from News;
select * from Category;
insert into Category(cat_id,category) values (3,"science");
insert into News(title,postBody,photo,dateandTime,author,priority,admin_id,cat_id) values ("abc","sadsadsa","asfsafsaf.jpg",datetime('now', 'localtime'),"sadasd",1,1,1);

select * from News natural join Category where category='sports';