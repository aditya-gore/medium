import { Hono } from 'hono';
import { PrismaClient } from '@prisma/client/edge';
import { withAccelerate } from '@prisma/extension-accelerate';
import { verify } from 'hono/jwt';
import { createBlogInput, updateBlogInput } from 'adityamediumtypes';

export const blogRouter = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JWT_SECRET: string;
  };
  Variables: {
    userId: string;
  };
}>();

blogRouter.use('/*', async (c, next) => {
  try {
    const authHeader = c.req.header('authorization') || '';
    const user = await verify(authHeader, c.env.JWT_SECRET);
    if (user) {
      c.set('userId', user.id);
      await next();
    } else {
      c.status(403);
      return c.json({
        message: 'unauthorized',
      });
    }
  } catch (error: any) {
    c.status(404);
    return c.json({
      message: error.message,
    });
  }
});

blogRouter.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const userId = c.get('userId');
    const prisma = new PrismaClient({
      datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate());
    const { success } = createBlogInput.safeParse(body);
    if (!success) {
      c.status(400);
      return c.json({ error: 'invalid input' });
    }

    const blog = await prisma.post.create({
      data: {
        title: body.title,
        content: body.content,
        authorId: userId,
      },
    });
    return c.json({
      id: blog.id,
    });
  } catch (error: any) {
    c.status(400);
    return c.json(error.message);
  }
});

blogRouter.put('/', async (c) => {
  try {
    const body = await c.req.json();
    const prisma = new PrismaClient({
      datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate());
    const { success } = updateBlogInput.safeParse(body);
    if (!success) {
      c.status(400);
      return c.json({ error: 'invalid input' });
    }
    const blog = await prisma.post.update({
      where: {
        id: body.id,
      },
      data: {
        title: body.title,
        content: body.content,
      },
    });
    return c.json({
      id: blog.id,
    });
  } catch (error: any) {
    c.status(400);
    return c.json(error.message);
  }
});

blogRouter.get('/bulk', async (c) => {
  try {
    const prisma = new PrismaClient({
      datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate());
    const blogs = await prisma.post.findMany();
    return c.json({
      blogs,
    });
  } catch (error: any) {
    c.status(400);
    return c.json({ message: error.message });
  }
});

blogRouter.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const prisma = new PrismaClient({
      datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate());
    const blog = await prisma.post.findFirst({
      where: {
        id,
      },
    });
    return c.json(blog);
  } catch (error: any) {
    c.status(400);
    return c.json({ message: error.message });
  }
});
