-- create the DB
create database if not exists url_shortener;
use url_shortener;

-- create table 1: store each short url and its original long url
create table if not exists urls(
  id int auto_increment primary key,
  short_code varchar(16) unique not null,
  long_url text not null,
  click_count int default 0,
  created_at timestamp default current_timestamp
);

-- create table 2: store a tuple each time user click a short url
create table if not exists url_clicks (
  id int auto_increment primary key,
  url_id int not null,
  clicked_at timestamp default current_timestamp,
  ip_address varchar(64),
  foreign key (url_id) references urls(id)
);
